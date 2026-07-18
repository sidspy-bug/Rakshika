"""Notification service configuration."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class NotificationServiceSettings(AppSettings):
    """Top-level notification service settings."""

    app_name: str = "Rakshika Notification Service"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT
    firebase_credentials_path: str | None = Field(default=None, alias="FIREBASE_CREDENTIALS_PATH")

    # SMTP settings for email alerts to emergency contacts
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")

    # Base URL for evidence live feed links sent in alert emails
    emergency_evidence_base_url: str = Field(
        default="http://localhost:8000/api/v1",
        alias="EMERGENCY_EVIDENCE_BASE_URL",
    )

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> NotificationServiceSettings:
    """Return a cached notification service settings instance."""

    settings = NotificationServiceSettings()
    settings.validate_runtime_requirements()
    return settings

