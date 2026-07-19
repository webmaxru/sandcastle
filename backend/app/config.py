"""Application configuration for the Sandcastle backend.

Environment variables map to two concerns:

1. How the spawned GitHub Copilot CLI authenticates / which model it uses.
2. Sandcastle's own runtime knobs (session limits, CORS, observability).

Auth modes (see plan.md / docs):
* Local-first  -> COPILOT_GITHUB_TOKEN (fine-grained PAT, "Copilot Requests")
                  or the developer's existing `copilot` CLI login.
* Hosted demo  -> BYOK: COPILOT_PROVIDER_BASE_URL + COPILOT_PROVIDER_API_KEY
                  (e.g. Azure OpenAI) so no Copilot seat is shared.
"""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    # --- Model / Copilot CLI ---
    copilot_model: str | None = Field(default=None, alias="GITHUB_COPILOT_MODEL")
    copilot_timeout: int = Field(default=300, alias="GITHUB_COPILOT_TIMEOUT")

    # --- BYOK (hosted demo, ToS-compliant) ---
    # BYOK is activated by COPILOT_PROVIDER_BASE_URL alone (GitHub auth not required).
    # A model is REQUIRED at CLI startup — set GITHUB_COPILOT_MODEL (or provider_wire_model).
    provider_base_url: str | None = Field(default=None, alias="COPILOT_PROVIDER_BASE_URL")
    provider_api_key: str | None = Field(default=None, alias="COPILOT_PROVIDER_API_KEY")
    provider_type: str = Field(default="openai", alias="COPILOT_PROVIDER_TYPE")
    provider_bearer_token: str | None = Field(default=None, alias="COPILOT_PROVIDER_BEARER_TOKEN")
    provider_model_id: str | None = Field(default=None, alias="COPILOT_PROVIDER_MODEL_ID")
    provider_wire_model: str | None = Field(default=None, alias="COPILOT_PROVIDER_WIRE_MODEL")

    # --- GitHub auth (local-first) ---
    github_token: str | None = Field(default=None, alias="COPILOT_GITHUB_TOKEN")

    # --- Session sandbox runtime ---
    sessions_root: str = Field(default="./.sessions", alias="SANDCASTLE_SESSIONS_ROOT")
    max_concurrent_sessions: int = Field(default=3, alias="SANDCASTLE_MAX_SESSIONS")
    session_timeout_seconds: int = Field(default=600, alias="SANDCASTLE_SESSION_TIMEOUT")
    max_fix_attempts: int = Field(default=2, alias="SANDCASTLE_MAX_FIX_ATTEMPTS")

    # --- Hardening (hosted demo) ---
    ratelimit_enabled: bool = Field(default=False, alias="SANDCASTLE_RATELIMIT")
    rate_sessions_per_hour: int = Field(default=20, alias="SANDCASTLE_RATE_SESSIONS_PER_HOUR")
    rate_builds_per_min: int = Field(default=6, alias="SANDCASTLE_RATE_BUILDS_PER_MIN")
    max_stream_events: int = Field(default=8000, alias="SANDCASTLE_MAX_STREAM_EVENTS")
    max_event_field_chars: int = Field(default=8000, alias="SANDCASTLE_MAX_EVENT_FIELD_CHARS")
    max_text_file_bytes: int = Field(default=1_000_000, alias="SANDCASTLE_MAX_TEXT_FILE_BYTES")

    # --- Web ---
    cors_origins: str = Field(default="*", alias="SANDCASTLE_CORS_ORIGINS")

    # --- Observability ---
    app_insights_conn: str | None = Field(
        default=None, alias="APPLICATIONINSIGHTS_CONNECTION_STRING"
    )
    otel_console: bool = Field(default=False, alias="SANDCASTLE_OTEL_CONSOLE")

    # --- MCP grounding ---
    learn_mcp_enabled: bool = Field(default=True, alias="SANDCASTLE_LEARN_MCP")
    learn_mcp_url: str = Field(
        default="https://learn.microsoft.com/api/mcp", alias="SANDCASTLE_LEARN_MCP_URL"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def byok_enabled(self) -> bool:
        # BYOK is activated by the provider base URL alone (per `copilot help providers`);
        # the API key is optional for some providers (e.g. local Ollama).
        return bool(self.provider_base_url)

    @property
    def byok_model(self) -> str | None:
        # The model the CLI needs at startup for BYOK (COPILOT_MODEL).
        return self.copilot_model or self.provider_wire_model or self.provider_model_id


settings = Settings()
