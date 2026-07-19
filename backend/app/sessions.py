"""Session manager: one sandboxed GitHub Copilot build agent per session.

Each session owns:
* a scratch working directory (where the agent writes/builds the app),
* a CopilotClient bound to that directory,
* a GitHubCopilotAgent (Builder) kept alive across requests via an AsyncExitStack,
* an AgentSession for conversational memory (iterate on the same app).
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

from .config import settings

BUILDER_INSTRUCTIONS = """\
You are Sandcastle's Builder agent. You build COMPLETE, working, static web apps
that run entirely in the browser — no backend server, no build step, no compilation.

Rules:
- Work in the current working directory. Create and edit files directly there.
- The entry point MUST be a file named `index.html` at the root of the working directory.
- Use only vanilla HTML, CSS, and JavaScript. You MAY use CDN <script>/<link> tags for
  libraries, but prefer dependency-free solutions.
- Make it visually polished, responsive, and immediately runnable by opening index.html.
- Do NOT start a web server, dev server, or any long-running/blocking process.
- Do NOT ask the user questions — make reasonable assumptions and keep going.
- When asked for changes, edit the existing files in place (don't start over).
- When finished, end with a one-paragraph summary of what you built.
"""

# Tool argument keys that are safe/useful to surface in the activity feed
# (avoids streaming large file contents over SSE).
_SUMMARY_KEYS = ("path", "command", "cmd", "url", "file_path", "filename")


def _tool_summary(tool: str, args: dict[str, Any] | None) -> str:
    args = args or {}
    tool_l = (tool or "").lower()
    if any(k in tool_l for k in ("shell", "bash", "run", "exec")):
        return "$ " + str(args.get("command") or args.get("cmd") or "")
    for k in ("path", "file_path", "filename", "url"):
        if args.get(k):
            return f"{tool} {args[k]}"
    return tool


def _compact_args(args: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(args, dict):
        return {}
    return {k: args[k] for k in _SUMMARY_KEYS if k in args}


def sse_events_from_update(update: Any) -> list[dict[str, Any]]:
    """Translate an AgentResponseUpdate into zero or more UI activity events."""
    text = getattr(update, "text", "") or ""
    raw = getattr(update, "raw_representation", None)
    data = getattr(raw, "data", None)
    dname = type(data).__name__ if data is not None else ""

    if dname == "ToolExecutionStartData":
        tool = getattr(data, "tool_name", "") or ""
        args = getattr(data, "arguments", {})
        return [{
            "type": "tool_start",
            "id": getattr(data, "tool_call_id", ""),
            "tool": tool,
            "summary": _tool_summary(tool, args),
            "args": _compact_args(args),
        }]
    if dname == "ToolExecutionCompleteData":
        return [{
            "type": "tool_end",
            "id": getattr(data, "tool_call_id", ""),
            "success": getattr(data, "success", None),
            "error": getattr(data, "error", None),
        }]
    if dname == "AssistantUsageData":
        return [{"type": "usage", "model": getattr(data, "model", None)}]
    # AssistantMessageDeltaData and anything else with text -> narration
    if text:
        return [{"type": "text", "text": text}]
    return []


@dataclass
class Session:
    id: str
    workdir: pathlib.Path
    agent: GitHubCopilotAgent
    agent_session: Any
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

    # --- CopilotClient factory (auth mode aware) ---
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
        stack = contextlib.AsyncExitStack()
        agent = await stack.enter_async_context(
            GitHubCopilotAgent(
                instructions=BUILDER_INSTRUCTIONS,
                client=client,
                default_options=self._default_options(),
            )
        )
        agent_session = agent.create_session(session_id=sid)
        session = Session(
            id=sid, workdir=workdir, agent=agent,
            agent_session=agent_session, stack=stack,
        )
        self._sessions[sid] = session
        return session

    def get(self, sid: str) -> Session | None:
        return self._sessions.get(sid)

    async def run_build(self, session: Session, prompt: str) -> AsyncIterator[dict[str, Any]]:
        """Run a build/iterate turn, yielding UI activity events."""
        async with session.lock:
            yield {"type": "status", "state": "building"}
            try:
                async for update in session.agent.run(
                    prompt, stream=True, session=session.agent_session
                ):
                    for ev in sse_events_from_update(update):
                        yield ev
            except Exception as exc:  # noqa: BLE001
                yield {"type": "error", "message": str(exc)}
                return
            has_index = (session.workdir / "index.html").exists()
            yield {"type": "files", "files": session.list_files()}
            yield {
                "type": "done",
                "preview": f"/api/preview/{session.id}/" if has_index else None,
                "has_index": has_index,
            }

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
