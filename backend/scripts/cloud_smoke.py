"""Cloud E2E: drive a real build on the DEPLOYED backend and verify the preview.

Points at the live Azure Container Apps backend (env BASE). Runs one build turn
through the full Planner -> Builder -> Fixer pipeline, consumes the SSE stream,
then fetches the generated preview. Proves the hosted URL actually builds apps.
"""
from __future__ import annotations

import json
import os
import sys
import time

import httpx

sys.stdout.reconfigure(encoding="utf-8")

BASE = os.environ.get("BASE", "").rstrip("/")
PROMPT = os.environ.get(
    "PROMPT",
    "Build a single self-contained index.html: a polished dark 'Hello from Sandcastle' "
    "landing page with an animated gradient background and a button that reveals a random "
    "developer productivity tip. No external assets.",
)


def main() -> int:
    if not BASE:
        print("set BASE env to the backend URL")
        return 2
    print(f"[backend] {BASE}")
    with httpx.Client(timeout=httpx.Timeout(900.0)) as c:
        sid = c.post(f"{BASE}/api/sessions").json()["id"]
        print(f"[session] {sid}")

        phases: list[str] = []
        tools: dict[str, int] = {}
        done: dict = {}
        t0 = time.time()
        with c.stream("POST", f"{BASE}/api/sessions/{sid}/build", json={"prompt": PROMPT}) as r:
            print(f"[build] HTTP {r.status_code}")
            event = None
            for line in r.iter_lines():
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    p = json.loads(line[5:].strip())
                    t = p.get("type")
                    if t == "phase":
                        phases.append(p.get("agent", "?"))
                        print(f"  > [{p.get('agent')}] {p.get('label')}  (+{time.time()-t0:.0f}s)")
                    elif t == "tool_start":
                        ag = p.get("agent", "?")
                        tools[ag] = tools.get(ag, 0) + 1
                        print(f"      tool ({ag}) {str(p.get('summary',''))[:80]}")
                    elif t == "validation":
                        st = "green" if p.get("green") else f"{len(p.get('issues',[]))} issue(s)"
                        print(f"  validation#{p.get('attempt')}: {st}")
                    elif t == "error":
                        print(f"  ERROR [{p.get('agent')}]: {str(p.get('message'))[:160]}")
                    elif t == "done":
                        done = p

        dt = time.time() - t0
        print(f"[done] phases={phases} tools={tools} green={done.get('green')} "
              f"preview={done.get('preview')} ({dt:.0f}s)")

        prev = c.get(f"{BASE}/api/preview/{sid}/")
        body = prev.text.lower()
        looks_real = prev.status_code == 200 and len(body) > 400 and "<button" in body
        print(f"[preview] status={prev.status_code} bytes={len(prev.text)} has_button={'<button' in body}")

        files = c.get(f"{BASE}/api/sessions/{sid}/files").json().get("files", [])
        print(f"[files] {len(files)}: " + ", ".join(f['path'] for f in files[:12]))
        c.delete(f"{BASE}/api/sessions/{sid}")

        ok = bool(done.get("green")) and looks_real
        print("\nCLOUD E2E PASS" if ok else "\nCLOUD E2E REVIEW")
        return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
