"""Static-app validator: produces the concrete self-healing signal for the Fixer.

Checks (all best-effort, low false-positive for vanilla static apps):
* index.html exists and is non-trivial.
* Inline and local <script> JavaScript passes `node --check` (syntax only).
* Locally referenced assets (src/href, non-URL) exist on disk.
"""
from __future__ import annotations

import asyncio
import re
import shutil
import tempfile
from pathlib import Path

_SCRIPT_RE = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.IGNORECASE | re.DOTALL)
_ATTR_RE = re.compile(r"""(\w[\w-]*)\s*=\s*["']([^"']*)["']""")
_REF_RE = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)

_EXTERNAL_PREFIXES = ("http://", "https://", "//", "data:", "mailto:", "tel:", "#", "javascript:")


def _node_available() -> bool:
    return shutil.which("node") is not None


async def _node_check(source: str, is_module: bool) -> str | None:
    """Return an error string if `source` has a JS syntax error, else None."""
    suffix = ".mjs" if is_module else ".js"
    with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False, encoding="utf-8") as fh:
        fh.write(source)
        tmp = fh.name
    try:
        proc = await asyncio.create_subprocess_exec(
            "node", "--check", tmp,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode == 0:
            return None
        lines = (stderr.decode("utf-8", "replace") or "").strip().splitlines()
        # Prefer the path-free "SyntaxError: ..." line; fall back to the last line.
        errs = [m.strip() for m in lines if "Error:" in m]
        detail = errs[-1] if errs else (lines[-1].strip() if lines else "JavaScript syntax error")
        return detail[:200]
    except FileNotFoundError:
        return None
    finally:
        Path(tmp).unlink(missing_ok=True)


def _attrs(raw: str) -> dict[str, str]:
    return {k.lower(): v for k, v in _ATTR_RE.findall(raw or "")}


def _is_local_ref(ref: str) -> bool:
    ref = ref.strip()
    return bool(ref) and not ref.lower().startswith(_EXTERNAL_PREFIXES)


async def validate_workspace(workdir: Path) -> list[str]:
    """Return a list of human-readable problems (empty list == green)."""
    issues: list[str] = []
    workdir = Path(workdir)
    index = workdir / "index.html"

    if not index.exists():
        return ["index.html is missing at the app root — create a self-contained index.html entry point."]
    try:
        html = index.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError) as exc:
        return [f"index.html could not be read: {exc}"]
    if len(html.strip()) < 40:
        issues.append("index.html is essentially empty — build the actual app.")

    node_ok = _node_available()

    # --- JS syntax (inline + local external) ---
    for raw_attrs, body in _SCRIPT_RE.findall(html):
        attrs = _attrs(raw_attrs)
        src = attrs.get("src")
        is_module = attrs.get("type", "").lower() == "module"
        if src:
            if _is_local_ref(src):
                asset = (workdir / src.lstrip("/")).resolve()
                if not asset.exists():
                    issues.append(f"Referenced script '{src}' does not exist in the workspace.")
                elif node_ok and asset.suffix in (".js", ".mjs"):
                    err = await _node_check(asset.read_text(encoding="utf-8", errors="replace"),
                                            is_module or asset.suffix == ".mjs")
                    if err:
                        issues.append(f"Syntax error in '{src}': {err}")
            continue
        if node_ok and body.strip():
            err = await _node_check(body, is_module)
            if err:
                issues.append(f"Syntax error in an inline <script> in index.html: {err}")

    # --- Referenced local assets exist ---
    for ref in _REF_RE.findall(html):
        if _is_local_ref(ref):
            asset = (workdir / ref.split("?")[0].split("#")[0].lstrip("/")).resolve()
            try:
                asset.relative_to(workdir.resolve())
            except ValueError:
                continue
            if not asset.exists():
                msg = f"Referenced asset '{ref}' does not exist in the workspace."
                if msg not in issues and f"Referenced script '{ref}'" not in " ".join(issues):
                    issues.append(msg)

    # De-duplicate while preserving order.
    seen: set[str] = set()
    return [i for i in issues if not (i in seen or seen.add(i))]
