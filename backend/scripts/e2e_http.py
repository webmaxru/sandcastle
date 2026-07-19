"""Phase 1 end-to-end check against a running Sandcastle backend.

Creates a session, streams a real build, then verifies files + preview.
Run with the backend up on 127.0.0.1:8099.
"""
from __future__ import annotations

import json
import sys
import time

import httpx

sys.stdout.reconfigure(encoding="utf-8")  # cp1252-safe

BASE = "http://127.0.0.1:8099"
PROMPT = (
    "Build a classic Snake game playable with the arrow keys. Use an HTML canvas, "
    "keep score, and give it a polished dark neon look. Single self-contained index.html."
)


def main() -> int:
    with httpx.Client(timeout=httpx.Timeout(600.0)) as c:
        sid = c.post(f"{BASE}/api/sessions").json()["id"]
        print(f"[session] {sid}")

        tools: dict[str, str] = {}
        n_start = n_end = 0
        text_chars = 0
        t0 = time.time()

        with c.stream("POST", f"{BASE}/api/sessions/{sid}/build",
                      json={"prompt": PROMPT}) as r:
            event = None
            for line in r.iter_lines():
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    payload = json.loads(line[5:].strip())
                    t = payload.get("type")
                    if t == "tool_start":
                        n_start += 1
                        tools[payload.get("id", "")] = payload.get("summary", "")
                        print(f"  ⚙  {payload.get('summary','')}")
                    elif t == "tool_end":
                        n_end += 1
                    elif t == "text":
                        text_chars += len(payload.get("text", ""))
                    elif t == "status":
                        print(f"  … {payload.get('state')}")
                    elif t == "error":
                        print(f"  ✗ ERROR: {payload.get('message')}")
                    elif t == "done":
                        print(f"  ✓ done preview={payload.get('preview')} "
                              f"has_index={payload.get('has_index')}")

        dt = time.time() - t0
        print(f"[stream] {n_start} tool starts / {n_end} ends, "
              f"{text_chars} narration chars, {dt:.0f}s")

        files = c.get(f"{BASE}/api/sessions/{sid}/files").json()["files"]
        print(f"[files] {len(files)}: " + ", ".join(f['path'] for f in files[:20]))

        prev = c.get(f"{BASE}/api/preview/{sid}/")
        html = prev.text
        ok_html = prev.status_code == 200 and "<canvas" in html.lower()
        print(f"[preview] status={prev.status_code} bytes={len(html)} "
              f"has_canvas={'<canvas' in html.lower()}")

        c.delete(f"{BASE}/api/sessions/{sid}")
        print(f"[cleanup] deleted {sid}")

        index_present = any(f["path"] == "index.html" for f in files)
        if index_present and ok_html:
            print("\nE2E PASS ✅")
            return 0
        print("\nE2E FAIL ❌")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
