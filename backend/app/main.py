"""Sandcastle backend — FastAPI app.

Exposes health + config introspection plus the Phase 1 core build loop:
create a session, stream a build (SSE), browse generated files, and serve the
live preview. See plan.md for the full roadmap.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router
from .config import settings
from .sessions import manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await manager.shutdown()


app = FastAPI(
    title="Sandcastle API",
    description="Live App Builder powered by GitHub Copilot Agents (Microsoft Agent Framework).",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "sandcastle-backend", "version": app.version}


@app.get("/api/config")
async def public_config() -> dict:
    """Non-secret runtime configuration for the frontend / diagnostics."""
    return {
        "auth_mode": "byok" if settings.byok_enabled else "copilot",
        "model": settings.copilot_model or "auto",
        "agents": ["planner", "builder", "fixer"],
        "max_concurrent_sessions": settings.max_concurrent_sessions,
        "max_fix_attempts": settings.max_fix_attempts,
        "session_timeout_seconds": settings.session_timeout_seconds,
        "observability": bool(settings.app_insights_conn),
    }
