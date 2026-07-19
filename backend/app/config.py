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
    provider_base_url: str | None = Field(default=None, alias="COPILOT_PROVIDER_BASE_URL")
    provider_api_key: str | None = Field(default=None, alias="COPILOT_PROVIDER_API_KEY")

    # --- GitHub auth (local-first) ---
    github_token: str | None = Field(default=None, alias="COPILOT_GITHUB_TOKEN")

    # --- Session sandbox runtime ---
    sessions_root: str = Field(default="./.sessions", alias="SANDCASTLE_SESSIONS_ROOT")
    max_concurrent_sessions: int = Field(default=3, alias="SANDCASTLE_MAX_SESSIONS")
    session_timeout_seconds: int = Field(default=600, alias="SANDCASTLE_SESSION_TIMEOUT")
    max_fix_attempts: int = Field(default=2, alias="SANDCASTLE_MAX_FIX_ATTEMPTS")

    # --- Web ---
    cors_origins: str = Field(default="*", alias="SANDCASTLE_CORS_ORIGINS")

    # --- Observability ---
    app_insights_conn: str | None = Field(
        default=None, alias="APPLICATIONINSIGHTS_CONNECTION_STRING"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def byok_enabled(self) -> bool:
        return bool(self.provider_base_url and self.provider_api_key)


settings = Settings()
