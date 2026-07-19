"""Phase 5 proof: confirm Agent Framework instrumentation emits OTel spans.

Runs one real (tiny) build through the live SessionManager with console
exporters enabled, so every agent invocation / tool call / model request is
dumped to stdout as an OpenTelemetry span. Run with SANDCASTLE_OTEL_CONSOLE=true.
"""
import asyncio
import sys

sys.stdout.reconfigure(encoding="utf-8")

from backend.app.observability import setup_observability  # noqa: E402

print("OBS_STATE:", setup_observability(), flush=True)

from backend.app.sessions import manager  # noqa: E402  (import after setup)

PROMPT = (
    "Create a complete, valid index.html for a page titled 'Pong' with an "
    "<h1>Pong</h1> heading and a short <p> paragraph describing it. "
    "Plain HTML only — no CSS, no JavaScript."
)


async def main() -> None:
    session = await manager.create()
    print("SESSION:", session.id, flush=True)
    print("=== BUILD START (spans stream below) ===", flush=True)
    last = None
    async for ev in manager.run_build(session, PROMPT):
        t = ev.get("type")
        if t in ("done", "error", "validation"):
            last = ev
            print("EVENT:", t, ev.get("green", ev.get("preview", "")), flush=True)
    await manager.delete(session.id)
    print("=== BUILD DONE ===", "final:", last, flush=True)


asyncio.run(main())
