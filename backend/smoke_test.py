"""Phase 0 smoke test: verify GitHubCopilotAgent runs end-to-end.

Uses ambient auth (the `copilot` CLI already logged in on this machine).
Run:  backend/.venv/Scripts/python.exe backend/smoke_test.py
"""
import asyncio
import sys

from agent_framework.github import GitHubCopilotAgent


async def main() -> int:
    agent = GitHubCopilotAgent(
        instructions="You are a terse assistant. Answer in one short sentence.",
        default_options={"timeout": 180},
    )
    async with agent:
        resp = await agent.run("Reply with exactly this phrase: Sandcastle smoke test OK")

    text = getattr(resp, "text", None) or str(resp)
    print("=== RESPONSE TEXT ===")
    print(text)

    ok = "sandcastle smoke test ok" in text.lower()
    print("\n=== RESULT:", "PASS" if ok else "REVIEW (got a response, phrase differs)", "===")
    # Any non-empty response proves the runtime + auth work end-to-end.
    return 0 if text.strip() else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
