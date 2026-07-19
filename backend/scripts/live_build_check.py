"""Live end-to-end UI test: drive the real Sandcastle SPA through a full build.

Types a prompt, clicks Build, waits for the agent team to produce a live
preview iframe, and verifies the generated app actually renders inside it.
Captures console/page errors and screenshots throughout.
"""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("SANDCASTLE_UI_BASE", "http://localhost:5173/")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
PROMPT = (
    "Build a single self-contained index.html page: a big centered heading that "
    "says 'Sandcastle Live', a subtitle, and a button labeled 'Surprise me' that "
    "sets the page background to a random pastel color each click. Polished, no build step."
)

console_errors: list[str] = []
page_errors: list[str] = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    page.goto(BASE, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(800)

    page.fill("textarea.prompt-input", PROMPT)
    page.click("button.build-btn")
    print("build started; streaming...", flush=True)

    # Let the activity feed stream for a bit, then snapshot the "building" state.
    page.wait_for_timeout(8000)
    feed = page.inner_text(".left-body")
    print("FEED SNAPSHOT (first 600 chars):")
    print(feed[:600])
    page.screenshot(path=f"{OUT}/live_building.png", full_page=True)

    # Wait for the live preview iframe to appear (agents finished + green).
    page.wait_for_selector("iframe.preview-frame", timeout=240000)
    page.wait_for_timeout(2500)  # let iframe content load

    frame = page.frame_locator("iframe.preview-frame")
    heading_ok = frame.get_by_text("Sandcastle Live").count() > 0
    button_ok = frame.get_by_role("button").count() > 0
    inner = ""
    try:
        inner = page.eval_on_selector(
            "iframe.preview-frame",
            "el => el.contentDocument ? el.contentDocument.body.innerText.slice(0,300) : ''",
        )
    except Exception as e:  # noqa: BLE001
        inner = f"<eval error: {e}>"

    page.screenshot(path=f"{OUT}/live_done.png", full_page=True)

    # Also flip to the Code tab and confirm files listed.
    page.click("button.tab >> text=Code")
    page.wait_for_timeout(1200)
    code_body = page.inner_text(".right-body")
    page.screenshot(path=f"{OUT}/live_code.png", full_page=True)

    browser.close()

print("\nPREVIEW iframe innerText (first 300):")
print(" ", inner.replace("\n", " ⏎ "))
print("CODE TAB (first 300):")
print(" ", code_body[:300].replace("\n", " ⏎ "))
print(f"\nheading_in_preview: {heading_ok}")
print(f"button_in_preview:  {button_ok}")
print(f"PAGE_ERRORS ({len(page_errors)}):")
for e in page_errors:
    print("  -", e)
print(f"CONSOLE_ERRORS ({len(console_errors)}):")
for e in console_errors[:10]:
    print("  -", e)

ok = heading_ok and button_ok and not page_errors
print("\nRESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
