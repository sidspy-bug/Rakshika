"""Location service configuration."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class LocationServiceSettings(AppSettings):
    """Top-level location service settings."""

    app_name: str = "Rakshika Location Service"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> LocationServiceSettings:
    """Return a cached location service settings instance."""

    settings = LocationServiceSettings()
    settings.validate_runtime_requirements()
    return settings
