"""HTTP-layer test for Phase 6 rate limiting.

Stubs out the heavy agent-team creation so we test the route + limiter wiring
(not the Copilot CLI). Run in a process where SANDCASTLE_RATELIMIT=true and
SANDCASTLE_RATE_SESSIONS_PER_HOUR=2 are set BEFORE import.
"""
import sys

sys.stdout.reconfigure(encoding="utf-8")

from types import SimpleNamespace

from fastapi.testclient import TestClient

import backend.app.api.routes as routes
from backend.app.main import app


async def _fake_create():
    return SimpleNamespace(id="stub123")


routes.manager.create = _fake_create  # type: ignore[assignment]

with TestClient(app) as client:
    codes = []
    for _ in range(3):
        r = client.post("/api/sessions")
        codes.append(r.status_code)
    third = client.post("/api/sessions")

print("session POST status codes (limit=2/hr):", codes)
print("retry-after on blocked:", third.headers.get("retry-after"))

ok = codes[:2] == [200, 200] and codes[2] == 429 and third.status_code == 429
print("RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
