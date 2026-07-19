"""Sandcastle backend — FastAPI app.

Phase 0 exposes health + config introspection. The session/build/stream/preview
endpoints are added in Phase 1 (see plan.md).
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(
    title="Sandcastle API",
    description="Live App Builder powered by GitHub Copilot Agents (Microsoft Agent Framework).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "sandcastle-backend", "version": app.version}


@app.get("/api/config")
async def public_config() -> dict:
    """Non-secret runtime configuration for the frontend / diagnostics."""
    return {
        "auth_mode": "byok" if settings.byok_enabled else "copilot",
        "model": settings.copilot_model or "auto",
        "max_concurrent_sessions": settings.max_concurrent_sessions,
        "session_timeout_seconds": settings.session_timeout_seconds,
        "observability": bool(settings.app_insights_conn),
    }
