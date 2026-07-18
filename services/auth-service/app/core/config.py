"""Auth service settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class AuthenticationSettings(BaseModel):
    """Auth-service-specific security and lifecycle settings."""

    default_role_name: str = "user"
    admin_role_name: str = "admin"
    require_email_verification: bool = True
    otp_length: int = Field(default=6, ge=4, le=8)
    otp_ttl_seconds: int = Field(default=300, ge=60)
    otp_retry_limit: int = Field(default=5, ge=1)
    max_sessions_per_user: int = Field(default=5, ge=1)
    session_ttl_days: int = Field(default=30, ge=1)
    token_blacklist_ttl_seconds: int = Field(default=60 * 60 * 24 * 30, ge=60)
    login_failure_lockout_minutes: int = Field(default=15, ge=1)
    password_min_length: int = Field(default=8, ge=8)


class AuthServiceSettings(AppSettings):
    """Top-level auth service settings."""

    app_name: str = "Rakshika Auth Service"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT
    auth: AuthenticationSettings = Field(default_factory=AuthenticationSettings)

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> AuthServiceSettings:
    """Return a cached auth service settings instance."""

    settings = AuthServiceSettings()
    settings.validate_runtime_requirements()
    return settings
"""Auth service configuration placeholder."""
