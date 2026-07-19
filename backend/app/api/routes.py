"""Sandcastle HTTP API: sessions, streaming build, files, and live preview."""
from __future__ import annotations

import json
import mimetypes
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..config import settings
from ..ratelimit import SlidingWindowLimiter, client_key
from ..sessions import manager

router = APIRouter(prefix="/api")

# Per-client rate limiters (hosted demo). No-ops when limits are <= 0 / disabled.
_session_limiter = SlidingWindowLimiter(
    settings.rate_sessions_per_hour if settings.ratelimit_enabled else 0, 3600
)
_build_limiter = SlidingWindowLimiter(
    settings.rate_builds_per_min if settings.ratelimit_enabled else 0, 60
)


def _enforce(limiter: SlidingWindowLimiter, request: Request) -> None:
    key = client_key(request.headers.get("x-forwarded-for"), request.client.host if request.client else None)
    allowed, retry = limiter.check(key)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please slow down.",
            headers={"Retry-After": str(int(retry) + 1)},
        )


def _cap_event(ev: dict[str, Any]) -> dict[str, Any]:
    """Truncate oversized string fields so a single SSE frame stays bounded."""
    cap = settings.max_event_field_chars
    for field_name in ("text", "summary", "label", "error", "message"):
        val = ev.get(field_name)
        if isinstance(val, str) and len(val) > cap:
            ev[field_name] = val[:cap] + "…(truncated)"
    return ev


class BuildRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


@router.post("/sessions")
async def create_session(request: Request) -> dict[str, Any]:
    _enforce(_session_limiter, request)
    try:
        session = await manager.create()
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    return {"id": session.id, "preview": f"/api/preview/{session.id}/"}


@router.post("/sessions/{sid}/build")
async def build(sid: str, req: BuildRequest, request: Request) -> EventSourceResponse:
    _enforce(_build_limiter, request)
    session = manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_gen():
        count = 0
        async for ev in manager.run_build(session, req.prompt):
            count += 1
            if count > settings.max_stream_events:
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "type": "error",
                        "message": "Output limit reached; stopping stream.",
                        "fatal": True,
                    }),
                }
                break
            yield {"event": ev.get("type", "message"), "data": json.dumps(_cap_event(ev))}

    return EventSourceResponse(event_gen())


@router.get("/sessions/{sid}/files")
async def list_files(sid: str) -> dict[str, Any]:
    session = manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"files": session.list_files()}


@router.get("/sessions/{sid}/files/{path:path}")
async def get_file(sid: str, path: str) -> PlainTextResponse:
    session = manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    target = session.resolve_in_workdir(path)
    if target is None or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    if target.stat().st_size > settings.max_text_file_bytes:
        raise HTTPException(status_code=413, detail="File too large to display")
    try:
        text = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=415, detail="Binary file") from None
    return PlainTextResponse(text, headers={"X-Content-Type-Options": "nosniff"})


@router.delete("/sessions/{sid}")
async def delete_session(sid: str) -> dict[str, Any]:
    await manager.delete(sid)
    return {"deleted": sid}


@router.get("/preview/{sid}/{path:path}")
async def preview(sid: str, path: str) -> Response:
    session = manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    rel = path or "index.html"
    if rel.endswith("/"):
        rel += "index.html"
    target = session.resolve_in_workdir(rel)
    if target is None:
        raise HTTPException(status_code=403, detail="Invalid path")
    if target.is_dir():
        target = target / "index.html"
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    media_type, _ = mimetypes.guess_type(target.name)
    return FileResponse(target, media_type=media_type or "application/octet-stream")
