"""Community service settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class CommunityServiceOptions(BaseModel):
    """Community-service-specific settings."""

    default_radius_km: float = Field(default=3.0, ge=0.5, le=20.0)
    max_responders_notified: int = Field(default=15, ge=1)


class CommunityServiceSettings(AppSettings):
    """Top-level community service settings."""

    app_name: str = "Rakshika Community Service"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT
    community: CommunityServiceOptions = Field(default_factory=CommunityServiceOptions)

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> CommunityServiceSettings:
    """Return a cached community service settings instance."""

    settings = CommunityServiceSettings()
    settings.validate_runtime_requirements()
    return settings
