"""User service settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class UserServiceOptions(BaseModel):
    """Configurable knobs specific to the user service."""

    max_emergency_contacts: int = Field(default=10, ge=1, le=50)
    default_language: str = Field(default="en")
    profile_avatar_max_bytes: int = Field(default=5 * 1024 * 1024)


class UserServiceSettings(AppSettings):
    """Top-level user service settings."""

    app_name: str = "Rakshika User Service"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT
    user: UserServiceOptions = Field(default_factory=UserServiceOptions)

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> UserServiceSettings:
    """Return a cached user service settings instance."""

    settings = UserServiceSettings()
    settings.validate_runtime_requirements()
    return settings
