"""Probe: does CopilotClient(github_token=...) authenticate headlessly?

Mirrors sessions.py: build a client with an explicit github_token, attach a
GitHubCopilotAgent, run one trivial prompt. Proves whether a token (as would be
injected into a container) is sufficient for Copilot auth. Token read from env
COPILOT_GITHUB_TOKEN (never printed).
"""
import asyncio
import os
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")

from agent_framework.github import GitHubCopilotAgent
from copilot import CopilotClient


async def main() -> int:
    token = os.environ.get("COPILOT_GITHUB_TOKEN", "").strip()
    if not token:
        print("NO TOKEN in env COPILOT_GITHUB_TOKEN")
        return 2
    print(f"token present: len={len(token)} prefix={token[:4]}...")
    workdir = tempfile.mkdtemp(prefix="probe_")
    client = CopilotClient(github_token=token, working_directory=workdir, log_level="error")
    try:
        async with GitHubCopilotAgent(
            instructions="You are terse. Answer in one short sentence.",
            client=client,
            default_options={"timeout": 120},
        ) as agent:
            resp = await agent.run("Reply with exactly this phrase: TOKEN AUTH OK")
        text = getattr(resp, "text", None) or str(resp)
        print("=== RESPONSE ===")
        print(text[:400])
        ok = bool(text.strip())
        print("\n=== RESULT:", "PASS (token authenticates)" if ok else "EMPTY", "===")
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        print("=== EXCEPTION ===")
        print(type(e).__name__, str(e)[:600])
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
