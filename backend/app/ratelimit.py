"""Lightweight in-process rate limiting for the hosted demo (Phase 6 hardening).

A per-key sliding-window counter. Good enough for a single-replica free-tier
backend where the agent does real shell execution and must be shielded from
abuse. Disabled by default (local-first repo runs unthrottled); the hosted demo
enables it via ``SANDCASTLE_RATELIMIT=true``.
"""
from __future__ import annotations

import time
from collections import deque


class SlidingWindowLimiter:
    """Allow at most ``limit`` events per ``window`` seconds, per key.

    A non-positive ``limit`` disables the limiter (always allows).
    """

    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = float(window_seconds)
        self._hits: dict[str, deque[float]] = {}

    def check(self, key: str) -> tuple[bool, float]:
        """Return ``(allowed, retry_after_seconds)`` and record the hit if allowed."""
        if self.limit <= 0:
            return True, 0.0
        now = time.monotonic()
        dq = self._hits.get(key)
        if dq is None:
            dq = deque()
            self._hits[key] = dq
        while dq and now - dq[0] > self.window:
            dq.popleft()
        if len(dq) >= self.limit:
            return False, max(0.0, self.window - (now - dq[0]))
        dq.append(now)
        self._maybe_prune(now)
        return True, 0.0

    def _maybe_prune(self, now: float) -> None:
        """Drop stale keys so the map can't grow unbounded under many clients."""
        if len(self._hits) <= 1024:
            return
        for k in [k for k, d in self._hits.items() if not d or now - d[-1] > self.window]:
            self._hits.pop(k, None)


def client_key(x_forwarded_for: str | None, client_host: str | None) -> str:
    """Best-effort client identity: first X-Forwarded-For hop, else socket host."""
    if x_forwarded_for:
        first = x_forwarded_for.split(",")[0].strip()
        if first:
            return first
    return client_host or "unknown"
