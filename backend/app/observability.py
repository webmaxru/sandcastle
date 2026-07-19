"""OpenTelemetry / observability wiring for the Sandcastle backend.

Phase 5. Uses Microsoft Agent Framework's built-in instrumentation via
``configure_otel_providers()`` so every agent run, tool call, and model
request is traced automatically. Exporter selection (first match wins):

1. **Azure Application Insights** — when ``APPLICATIONINSIGHTS_CONNECTION_STRING``
   is set (the hosted / free-tier path). Requires
   ``azure-monitor-opentelemetry-exporter``.
2. **OTLP** — when ``OTEL_EXPORTER_OTLP_ENDPOINT`` is set (any OTel collector).
3. **Console** — when ``SANDCASTLE_OTEL_CONSOLE=true`` (local dev visibility).
4. **Disabled** — no exporter configured (default). Zero overhead, no crash.

Every path is defensive: a missing optional package or a bad connection string
logs a warning and leaves the app running with observability off. Sensitive
telemetry (prompt/response content) is disabled by default for privacy.
"""
from __future__ import annotations

import logging
import os

from .config import settings

logger = logging.getLogger("sandcastle.observability")

_state: dict[str, object] = {"enabled": False, "provider": None, "detail": None}


def observability_state() -> dict:
    """Current observability status (safe to expose to the frontend)."""
    return dict(_state)


def setup_observability() -> dict:
    """Initialize OpenTelemetry exactly once at application startup.

    No-ops (returns disabled) when nothing is configured. Never raises.
    """
    try:
        from agent_framework.observability import configure_otel_providers
    except Exception as exc:  # pragma: no cover - import guard
        logger.warning("Agent Framework observability unavailable: %s", exc)
        return observability_state()

    conn = settings.app_insights_conn
    otlp = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    console = settings.otel_console

    try:
        if conn:
            exporters = _azure_monitor_exporters(conn)
            if exporters:
                configure_otel_providers(
                    exporters=exporters,
                    enable_console_exporters=console,
                    enable_sensitive_data=False,
                )
                return _mark("azure_monitor", "Azure Application Insights")
            # Package missing -> fall through to other options.
        if otlp:
            configure_otel_providers(
                enable_console_exporters=console,
                enable_sensitive_data=False,
            )
            return _mark("otlp", otlp)
        if console:
            configure_otel_providers(
                enable_console_exporters=True,
                enable_sensitive_data=False,
            )
            return _mark("console", "console exporters (dev)")
    except Exception as exc:
        logger.warning("Observability setup failed (continuing without): %s", exc)
        _state.update(enabled=False, provider=None, detail=f"error: {exc}")
        return observability_state()

    logger.info("Observability disabled (no exporter configured).")
    return observability_state()


def _mark(provider: str, detail: str) -> dict:
    _state.update(enabled=True, provider=provider, detail=detail)
    logger.info("Observability enabled: %s (%s)", provider, detail)
    return observability_state()


def _azure_monitor_exporters(conn: str):
    """Build Azure Monitor trace/metric/log exporters, or None if unavailable."""
    try:
        from azure.monitor.opentelemetry.exporter import (
            AzureMonitorLogExporter,
            AzureMonitorMetricExporter,
            AzureMonitorTraceExporter,
        )
    except Exception as exc:
        logger.warning(
            "APPLICATIONINSIGHTS_CONNECTION_STRING is set but "
            "azure-monitor-opentelemetry-exporter is not installed (%s). "
            "Add it to enable App Insights export.",
            exc,
        )
        return None
    return [
        AzureMonitorTraceExporter(connection_string=conn),
        AzureMonitorMetricExporter(connection_string=conn),
        AzureMonitorLogExporter(connection_string=conn),
    ]
