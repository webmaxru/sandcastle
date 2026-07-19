"""Map Copilot AgentResponseUpdate objects to Sandcastle UI activity events."""
from __future__ import annotations

from typing import Any

# Tool argument keys safe/useful to surface (avoids streaming large file bodies).
_SUMMARY_KEYS = ("path", "command", "cmd", "url", "file_path", "filename", "query", "question")


def tool_summary(tool: str, args: dict[str, Any] | None) -> str:
    args = args or {}
    tool_l = (tool or "").lower()
    if "microsoft-learn" in tool_l or "microsoft_docs" in tool_l:
        q = args.get("query") or args.get("question") or args.get("url") or ""
        return f"Microsoft Learn: {q}" if q else "Microsoft Learn lookup"
    if any(k in tool_l for k in ("shell", "bash", "run", "exec")):
        return "$ " + str(args.get("command") or args.get("cmd") or "")
    for k in ("path", "file_path", "filename", "url"):
        if args.get(k):
            return f"{tool} {args[k]}"
    return tool


def compact_args(args: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(args, dict):
        return {}
    return {k: args[k] for k in _SUMMARY_KEYS if k in args}


def sse_events_from_update(update: Any) -> list[dict[str, Any]]:
    """Translate an AgentResponseUpdate into zero or more UI activity events."""
    text = getattr(update, "text", "") or ""
    raw = getattr(update, "raw_representation", None)
    data = getattr(raw, "data", None)
    dname = type(data).__name__ if data is not None else ""

    if dname == "ToolExecutionStartData":
        tool = getattr(data, "tool_name", "") or ""
        args = getattr(data, "arguments", {})
        return [{
            "type": "tool_start",
            "id": getattr(data, "tool_call_id", ""),
            "tool": tool,
            "summary": tool_summary(tool, args),
            "args": compact_args(args),
        }]
    if dname == "ToolExecutionCompleteData":
        return [{
            "type": "tool_end",
            "id": getattr(data, "tool_call_id", ""),
            "success": getattr(data, "success", None),
            "error": getattr(data, "error", None),
        }]
    if dname == "AssistantUsageData":
        return [{"type": "usage", "model": getattr(data, "model", None)}]
    if text:
        return [{"type": "text", "text": text}]
    return []
