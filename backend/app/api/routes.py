"""Sandcastle HTTP API: sessions, streaming build, files, and live preview."""
from __future__ import annotations

import json
import mimetypes
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..sessions import manager

router = APIRouter(prefix="/api")


class BuildRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


@router.post("/sessions")
async def create_session() -> dict[str, Any]:
    try:
        session = await manager.create()
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    return {"id": session.id, "preview": f"/api/preview/{session.id}/"}


@router.post("/sessions/{sid}/build")
async def build(sid: str, req: BuildRequest) -> EventSourceResponse:
    session = manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_gen():
        async for ev in manager.run_build(session, req.prompt):
            yield {"event": ev.get("type", "message"), "data": json.dumps(ev)}

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
    try:
        text = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=415, detail="Binary file") from None
    return PlainTextResponse(text)


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
