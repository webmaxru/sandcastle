"""Headless render smoke test for the Sandcastle frontend.

Loads the Vite dev server, captures console errors + page (runtime) errors,
verifies key UI landmarks are present, and writes a screenshot.
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:5173/"
SHOT = sys.argv[1] if len(sys.argv) > 1 else "render.png"

console_errors: list[str] = []
page_errors: list[str] = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    page.goto(URL, wait_until="networkidle", timeout=30000)
    # Give React a beat to hydrate + fetch /api/config
    page.wait_for_timeout(1500)

    body = page.inner_text("body")
    landmarks = {
        "brand": "Sandcastle" in body,
        "agents_chip": ("planner" in body.lower() and "builder" in body.lower()),
        "example_gallery": ("snake" in body.lower() or "example" in body.lower() or "try" in body.lower()),
        "prompt_bar": page.locator("textarea, input[type=text]").count() > 0,
        "build_button": page.get_by_role("button").count() > 0,
    }
    page.screenshot(path=SHOT, full_page=True)
    browser.close()

print("LANDMARKS:")
for k, v in landmarks.items():
    print(f"  {'OK ' if v else 'MISS'} {k}")
print(f"PAGE_ERRORS ({len(page_errors)}):")
for e in page_errors:
    print("  -", e)
print(f"CONSOLE_ERRORS ({len(console_errors)}):")
for e in console_errors:
    print("  -", e)

ok = all(landmarks.values()) and not page_errors
print("RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
