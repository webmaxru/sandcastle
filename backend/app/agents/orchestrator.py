"""Multi-agent orchestration: Planner -> Builder -> Fixer with self-healing.

A single manual orchestrator (rather than the Agent Framework Workflow engine) is used
deliberately so every underlying Copilot tool/text delta can be streamed live to the UI
activity feed, tagged by which agent produced it. All three agents share one per-session
CopilotClient/workspace and run sequentially.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, AsyncIterator

from ..validation import validate_workspace
from . import personas
from .stream_map import sse_events_from_update

if TYPE_CHECKING:  # avoid import cycle with sessions.py
    from ..sessions import Session


async def _stream_agent(agent: Any, prompt: str, lane: str, *, session: Any = None
                        ) -> AsyncIterator[dict[str, Any]]:
    """Run one agent turn, yielding UI events tagged with its lane; also collect text."""
    kwargs: dict[str, Any] = {"stream": True}
    if session is not None:
        kwargs["session"] = session
    async for update in agent.run(prompt, **kwargs):
        for ev in sse_events_from_update(update):
            ev["agent"] = lane
            yield ev


async def run_team(session: "Session", prompt: str, max_fix_attempts: int
                   ) -> AsyncIterator[dict[str, Any]]:
    """Drive the Planner -> Builder -> Fixer loop, yielding UI activity events."""
    workdir = session.workdir
    is_iteration = (workdir / "index.html").exists()

    # --- 1. Planner ---
    yield {"type": "phase", "agent": "planner", "label": "Planning the architecture"}
    plan_text = ""
    try:
        async for ev in _stream_agent(
            session.planner, personas.planner_prompt(prompt, is_iteration), "planner"
        ):
            if ev.get("type") == "text":
                plan_text += ev.get("text", "")
            yield ev
    except Exception as exc:  # noqa: BLE001 — planner is advisory; continue without a plan
        yield {"type": "error", "agent": "planner", "message": str(exc), "fatal": False}

    # --- 2. Builder ---
    yield {"type": "phase", "agent": "builder", "label": "Building the app"}
    try:
        async for ev in _stream_agent(
            session.builder,
            personas.builder_prompt(prompt, plan_text, is_iteration),
            "builder",
            session=session.builder_session,
        ):
            yield ev
    except Exception as exc:  # noqa: BLE001
        yield {"type": "error", "agent": "builder", "message": str(exc), "fatal": True}
        yield {"type": "files", "files": session.list_files()}
        yield {"type": "done", "preview": None, "has_index": False, "green": False}
        return

    # --- 3. Fixer (self-healing loop) ---
    issues = await validate_workspace(workdir)
    attempt = 0
    yield {"type": "validation", "attempt": attempt, "issues": issues, "green": not issues}
    while issues and attempt < max_fix_attempts:
        attempt += 1
        yield {"type": "phase", "agent": "fixer",
               "label": f"Fixing {len(issues)} issue(s) (attempt {attempt})"}
        try:
            async for ev in _stream_agent(
                session.fixer, personas.fixer_prompt(issues), "fixer"
            ):
                yield ev
        except Exception as exc:  # noqa: BLE001
            yield {"type": "error", "agent": "fixer", "message": str(exc), "fatal": False}
            break
        issues = await validate_workspace(workdir)
        yield {"type": "validation", "attempt": attempt, "issues": issues, "green": not issues}

    has_index = (workdir / "index.html").exists()
    yield {"type": "files", "files": session.list_files()}
    yield {
        "type": "done",
        "preview": f"/api/preview/{session.id}/" if has_index else None,
        "has_index": has_index,
        "green": not issues,
        "issues": issues,
    }
