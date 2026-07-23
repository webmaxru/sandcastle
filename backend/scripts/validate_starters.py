"""Validate the frontend's example-gallery starter prompts build one-shot.

For each starter it runs a SINGLE fresh session (no manual retries) through the
Planner -> Builder -> Fixer team and records the signals that decide whether the
prompt is a good, reliable sample:

* builder/fixer ``finish_reason`` (``length`` == the model truncated its output —
  the "16K token limit" symptom that leaves the app broken),
* how many self-heal (Fixer) passes were needed,
* the validator's final ``green`` verdict,
* preview HTTP status + a few content markers.

Sessions are left ALIVE and their ids written to ``validate_report.json`` so a
follow-up headless check (``preview_check.mjs``) can load each live preview before
cleanup. Run with the backend up on 127.0.0.1:8099.

Usage:
    python backend/scripts/validate_starters.py [--only NAME[,NAME...]]
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import httpx

sys.stdout.reconfigure(encoding="utf-8")  # cp1252-safe

BASE = "http://127.0.0.1:8099"
SESSIONS_DIR = Path(__file__).resolve().parent.parent / ".sessions"
REPORT = SESSIONS_DIR / "validate_report.json"
RESULTS = SESSIONS_DIR / "_results"

# Mirror of frontend/src/components/ExampleGallery.tsx. Keep prompts in sync with
# whatever ships in the gallery so this is a faithful one-shot validation.
STARTERS: dict[str, dict] = {
    "weather": {
        "featured": True,
        "prompt": (
            "A weather dashboard for any city. Include a search box to look up a city, then "
            "show its current conditions (temperature, wind, humidity, and a weather "
            "description with a matching icon) plus a 5-day forecast with daily high/low. "
            "Use the free, KEYLESS Open-Meteo API — no API key, token, or sign-up: geocode "
            "the city name with https://geocoding-api.open-meteo.com/v1/search?name=CITY and "
            "fetch weather from https://api.open-meteo.com/v1/forecast requesting current "
            "weather plus daily temperature_2m_max/min and weather_code. Map Open-Meteo "
            "weather codes to text + icons. Show loading and 'city not found' states, and "
            "load a sensible default city on first paint."
        ),
        "markers": ["°", "forecast"],
    },
    "pomodoro": {
        "prompt": (
            "A Pomodoro focus timer with 25/5 work-break cycles, a start/pause control, a "
            "chime, and a completed-session counter."
        ),
        "markers": ["25", "start"],
    },
    "markdown": {
        "prompt": (
            "A markdown note-taking app with a split-pane live preview and autosave to "
            "local storage."
        ),
        "markers": ["preview"],
    },
    "kanban": {
        "prompt": (
            "A drag-and-drop kanban board with To-do / Doing / Done columns, cards you can "
            "add and move, and due dates."
        ),
        "markers": ["doing", "done"],
    },
    "expense": {
        "prompt": (
            "A trip expense splitter: add people and expenses, then show who owes whom to "
            "settle up."
        ),
        "markers": ["expense"],
    },
    "typing": {
        "prompt": (
            "A typing-speed test that measures words-per-minute and accuracy against a "
            "sample paragraph, with a live result."
        ),
        "markers": ["wpm"],
    },
}


def run_build(c: httpx.Client, sid: str, prompt: str) -> dict:
    """Stream one build turn; return collected metrics."""
    usage: list[dict] = []
    validations: list[dict] = []
    tools_by_agent: dict[str, int] = {}
    errors: list[str] = []
    done: dict = {}
    cur_agent = "?"
    t0 = time.time()
    with c.stream("POST", f"{BASE}/api/sessions/{sid}/build", json={"prompt": prompt}) as r:
        for line in r.iter_lines():
            if not line.startswith("data:"):
                continue
            p = json.loads(line[5:].strip())
            t = p.get("type")
            if t == "phase":
                cur_agent = p.get("agent", "?")
            elif t == "tool_start":
                ag = p.get("agent", "?")
                tools_by_agent[ag] = tools_by_agent.get(ag, 0) + 1
            elif t == "usage":
                usage.append({
                    "agent": p.get("agent", cur_agent),
                    "finish": p.get("finish_reason"),
                    "in": p.get("input_tokens"),
                    "out": p.get("output_tokens"),
                    "model": p.get("model"),
                })
            elif t == "validation":
                validations.append(p)
            elif t == "error":
                errors.append(f"[{p.get('agent')}] {str(p.get('message'))[:160]}")
            elif t == "done":
                done = p
    dt = time.time() - t0

    truncated = [u for u in usage if (u.get("finish") or "").lower() == "length"]
    fix_attempts = max((v.get("attempt", 0) for v in validations), default=0)
    green = bool(done.get("green"))
    model = next((u["model"] for u in usage if u.get("model")), None)
    return {
        "seconds": round(dt, 1),
        "model": model,
        "green": green,
        "fix_attempts": fix_attempts,
        "truncated_agents": sorted({u["agent"] for u in truncated}),
        "usage": usage,
        "tools": tools_by_agent,
        "errors": errors,
        "done": done,
        "final_issues": done.get("issues", []),
    }


def check_preview(c: httpx.Client, sid: str, markers: list[str]) -> dict:
    r = c.get(f"{BASE}/api/preview/{sid}/")
    body = r.text.lower()
    return {
        "status": r.status_code,
        "bytes": len(r.text),
        "markers_hit": [m for m in markers if m.lower() in body],
        "markers_all": markers,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated starter names to run")
    args = ap.parse_args()

    names = list(STARTERS)
    if args.only:
        want = {n.strip() for n in args.only.split(",")}
        names = [n for n in names if n in want]

    report: dict[str, dict] = {}
    with httpx.Client(timeout=httpx.Timeout(900.0)) as c:
        for name in names:
            spec = STARTERS[name]
            print(f"\n=== {name}{' (featured)' if spec.get('featured') else ''} ===")
            print(f"    prompt: {spec['prompt'][:100]}…")
            sid = c.post(f"{BASE}/api/sessions").json()["id"]
            m = run_build(c, sid, spec["prompt"])
            pv = check_preview(c, sid, spec["markers"])
            m["sid"] = sid
            m["preview"] = f"/api/preview/{sid}/"
            m["preview_check"] = pv

            # Persist the generated app so a headless check can load it after the
            # session is freed (keeps us under the concurrent-session cap).
            ws = SESSIONS_DIR / sid / "workspace"
            dest = RESULTS / name
            if dest.exists():
                shutil.rmtree(dest, ignore_errors=True)
            if ws.exists():
                shutil.copytree(ws, dest)
                m["results_dir"] = str(dest)
                m["files"] = sorted(p.relative_to(dest).as_posix() for p in dest.rglob("*") if p.is_file())
            c.delete(f"{BASE}/api/sessions/{sid}")
            report[name] = m

            trunc = ("TRUNCATED:" + ",".join(m["truncated_agents"])) if m["truncated_agents"] else "no-trunc"
            verdict = "GREEN" if m["green"] else "RED"
            print(f"    -> {verdict} | fixes={m['fix_attempts']} | {trunc} | "
                  f"model={m['model']} | preview={pv['status']} {pv['bytes']}B "
                  f"markers={pv['markers_hit']}/{pv['markers_all']} | {m['seconds']}s")
            if m["errors"]:
                for e in m["errors"]:
                    print(f"       ! {e}")
            if m["final_issues"]:
                for i in m["final_issues"]:
                    print(f"       - unresolved: {str(i)[:120]}")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\n[report] {REPORT}")

    # Summary table.
    print("\n=== SUMMARY ===")
    for name, m in report.items():
        ok = m["green"] and not m["truncated_agents"] and m["preview_check"]["status"] == 200
        print(f"  {'PASS' if ok else 'FAIL'}  {name:10s} green={m['green']} "
              f"fixes={m['fix_attempts']} trunc={m['truncated_agents'] or '-'} "
              f"preview={m['preview_check']['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
