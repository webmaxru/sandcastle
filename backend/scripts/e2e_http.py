"""End-to-end HTTP integration check for the Sandcastle backend.

Exercises the full multi-agent flow (Planner -> Builder -> Fixer + self-healing) plus a
conversational iteration turn. Run with the backend up on 127.0.0.1:8099.
"""
from __future__ import annotations

import json
import sys
import time

import httpx

sys.stdout.reconfigure(encoding="utf-8")  # cp1252-safe

BASE = "http://127.0.0.1:8099"
TURN1 = (
    "Build a classic Snake game playable with the arrow keys. Use an HTML canvas, keep "
    "score, and give it a polished dark neon look. Single self-contained index.html."
)
TURN2 = "Add a persistent high score using localStorage and a pause button (P key)."


def run_turn(c: httpx.Client, sid: str, prompt: str, label: str) -> dict:
    print(f"\n=== {label} ===")
    phases: list[str] = []
    tools_by_agent: dict[str, int] = {}
    validations: list[dict] = []
    done = {}
    t0 = time.time()
    with c.stream("POST", f"{BASE}/api/sessions/{sid}/build", json={"prompt": prompt}) as r:
        event = None
        for line in r.iter_lines():
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                p = json.loads(line[5:].strip())
                t = p.get("type")
                if t == "phase":
                    phases.append(p.get("agent", "?"))
                    print(f"  ▸ [{p.get('agent')}] {p.get('label')}")
                elif t == "tool_start":
                    ag = p.get("agent", "?")
                    tools_by_agent[ag] = tools_by_agent.get(ag, 0) + 1
                    print(f"      ⚙ ({ag}) {p.get('summary','')[:80]}")
                elif t == "validation":
                    validations.append(p)
                    state = "green ✓" if p.get("green") else f"{len(p.get('issues',[]))} issue(s)"
                    print(f"  ✔ validation#{p.get('attempt')}: {state}")
                    for i in p.get("issues", []):
                        print(f"        - {i[:80]}")
                elif t == "error":
                    print(f"  ✗ error [{p.get('agent')}]: {p.get('message')[:120]}")
                elif t == "done":
                    done = p
    dt = time.time() - t0
    print(f"  → phases={phases} tools={tools_by_agent} "
          f"green={done.get('green')} preview={done.get('preview')} ({dt:.0f}s)")
    return done


def main() -> int:
    with httpx.Client(timeout=httpx.Timeout(900.0)) as c:
        sid = c.post(f"{BASE}/api/sessions").json()["id"]
        print(f"[session] {sid}")

        run_turn(c, sid, TURN1, "TURN 1 — build")
        prev1 = c.get(f"{BASE}/api/preview/{sid}/")
        has_canvas = "<canvas" in prev1.text.lower()
        print(f"[preview turn1] status={prev1.status_code} bytes={len(prev1.text)} canvas={has_canvas}")

        run_turn(c, sid, TURN2, "TURN 2 — iterate (add localStorage + pause)")
        prev2 = c.get(f"{BASE}/api/preview/{sid}/")
        html2 = prev2.text.lower()
        has_ls = "localstorage" in html2
        print(f"[preview turn2] status={prev2.status_code} bytes={len(prev2.text)} "
              f"canvas={'<canvas' in html2} localStorage={has_ls}")

        files = c.get(f"{BASE}/api/sessions/{sid}/files").json()["files"]
        print(f"[files] {len(files)}: " + ", ".join(f['path'] for f in files[:20]))
        c.delete(f"{BASE}/api/sessions/{sid}")
        print(f"[cleanup] deleted {sid}")

        ok = (prev1.status_code == 200 and has_canvas
              and prev2.status_code == 200 and "<canvas" in html2 and has_ls)
        print("\nE2E PASS ✅" if ok else "\nE2E FAIL ❌")
        return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
