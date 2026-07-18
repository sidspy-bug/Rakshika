"""Emergency service settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class EmergencyServiceOptions(BaseModel):
    """Emergency-service-specific settings."""

    default_broadcast_radius_km: float = Field(default=5.0, ge=0.5, le=50.0)
    responder_timeout_minutes: int = Field(default=15, ge=1)
    location_update_interval_seconds: int = Field(default=10, ge=2)


class EmergencyServiceSettings(AppSettings):
    """Top-level emergency service settings."""

    app_name: str = "Rakshika Emergency Service"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT
    emergency: EmergencyServiceOptions = Field(default_factory=EmergencyServiceOptions)

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> EmergencyServiceSettings:
    """Return a cached emergency service settings instance."""

    settings = EmergencyServiceSettings()
    settings.validate_runtime_requirements()
    return settings
