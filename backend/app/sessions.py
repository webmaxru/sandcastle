"""Session manager: one sandboxed GitHub Copilot agent-team per session.

Each session owns:
* a scratch working directory (where the team writes/builds the app),
* one CopilotClient bound to that directory (shared by all three agents),
* three GitHubCopilotAgent personas — Planner, Builder, Fixer — kept alive across
  requests via an AsyncExitStack,
* an AgentSession giving the Builder conversational memory (iterate on the same app).
"""
from __future__ import annotations

import asyncio
import contextlib
import pathlib
import shutil
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from agent_framework.github import GitHubCopilotAgent
from copilot import CopilotClient
from copilot.session import PermissionHandler

from .agents import personas
from .agents.orchestrator import run_team
from .config import settings


@dataclass
class Session:
    id: str
    workdir: pathlib.Path
    client: CopilotClient
    planner: GitHubCopilotAgent
    builder: GitHubCopilotAgent
    fixer: GitHubCopilotAgent
    builder_session: Any
    stack: contextlib.AsyncExitStack
    created_at: float = field(default_factory=time.time)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def list_files(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        if not self.workdir.exists():
            return out
        for p in sorted(self.workdir.rglob("*")):
            if p.is_file():
                out.append({
                    "path": p.relative_to(self.workdir).as_posix(),
                    "size": p.stat().st_size,
                })
        return out

    def resolve_in_workdir(self, rel: str) -> pathlib.Path | None:
        """Safely resolve a relative path inside the workdir (blocks traversal)."""
        target = (self.workdir / rel).resolve()
        try:
            target.relative_to(self.workdir.resolve())
        except ValueError:
            return None
        return target


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._root = pathlib.Path(settings.sessions_root).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _make_client(self, workdir: pathlib.Path) -> CopilotClient:
        kwargs: dict[str, Any] = {
            "working_directory": str(workdir),
            "log_level": "error",
        }
        if settings.byok_enabled:
            kwargs["env"] = {
                "COPILOT_PROVIDER_BASE_URL": settings.provider_base_url or "",
                "COPILOT_PROVIDER_API_KEY": settings.provider_api_key or "",
            }
        elif settings.github_token:
            kwargs["github_token"] = settings.github_token
        else:
            kwargs["use_logged_in_user"] = True
        return CopilotClient(**kwargs)

    def _default_options(self) -> dict[str, Any]:
        opts: dict[str, Any] = {
            "on_permission_request": PermissionHandler.approve_all,
            "timeout": float(settings.copilot_timeout),
        }
        if settings.copilot_model:
            opts["model"] = settings.copilot_model
        return opts

    def _expire_stale(self) -> None:
        now = time.time()
        stale = [
            sid for sid, s in self._sessions.items()
            if now - s.created_at > settings.session_timeout_seconds
        ]
        for sid in stale:
            asyncio.create_task(self.delete(sid))

    async def create(self) -> Session:
        self._expire_stale()
        if len(self._sessions) >= settings.max_concurrent_sessions:
            raise RuntimeError(
                f"Server busy: {settings.max_concurrent_sessions} concurrent build "
                "sessions already running. Try again shortly."
            )
        sid = uuid.uuid4().hex[:12]
        workdir = self._root / sid / "workspace"
        workdir.mkdir(parents=True, exist_ok=True)

        client = self._make_client(workdir)
        opts = self._default_options()
        stack = contextlib.AsyncExitStack()

        # All three personas share one client / workspace, run sequentially.
        planner = await stack.enter_async_context(
            GitHubCopilotAgent(instructions=personas.PLANNER_INSTRUCTIONS,
                               client=client, default_options=opts))
        builder = await stack.enter_async_context(
            GitHubCopilotAgent(instructions=personas.BUILDER_INSTRUCTIONS,
                               client=client, default_options=opts))
        fixer = await stack.enter_async_context(
            GitHubCopilotAgent(instructions=personas.FIXER_INSTRUCTIONS,
                               client=client, default_options=opts))
        builder_session = builder.create_session(session_id=sid)

        session = Session(
            id=sid, workdir=workdir, client=client,
            planner=planner, builder=builder, fixer=fixer,
            builder_session=builder_session, stack=stack,
        )
        self._sessions[sid] = session
        return session

    def get(self, sid: str) -> Session | None:
        return self._sessions.get(sid)

    async def run_build(self, session: Session, prompt: str) -> AsyncIterator[dict[str, Any]]:
        """Run one build/iterate turn through the agent team, yielding UI events."""
        async with session.lock:
            yield {"type": "status", "state": "building"}
            async for ev in run_team(session, prompt, settings.max_fix_attempts):
                yield ev

    async def delete(self, sid: str) -> None:
        session = self._sessions.pop(sid, None)
        if session is None:
            return
        with contextlib.suppress(Exception):
            await session.stack.aclose()
        with contextlib.suppress(Exception):
            shutil.rmtree(session.workdir.parent, ignore_errors=True)

    async def shutdown(self) -> None:
        for sid in list(self._sessions.keys()):
            await self.delete(sid)


manager = SessionManager()
