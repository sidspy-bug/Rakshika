"""Application settings built with Pydantic v2."""

from __future__ import annotations

from enum import Enum
from functools import lru_cache

from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class EnvironmentName(str, Enum):
    """Supported runtime environments."""

    DEVELOPMENT = "development"
    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "production"


class DatabaseSettings(BaseModel):
    """Database connection settings."""

    url: str = Field(default="", description="Async SQLAlchemy connection URL")
    echo: bool = False
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout_seconds: int = 30
    pool_recycle_seconds: int = 1800


class RedisSettings(BaseModel):
    """Redis connection settings."""

    url: str = Field(default="redis://localhost:6379/0")
    socket_timeout_seconds: int = 5
    health_check_interval_seconds: int = 30
    decode_responses: bool = True


class JwtSettings(BaseModel):
    """JWT settings."""

    secret_key: str = Field(default="")
    algorithm: str = Field(default="HS256")
    issuer: str = Field(default="rakshika")
    audience: str = Field(default="rakshika-api")
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    clock_skew_seconds: int = 30


class SecuritySettings(BaseModel):
    """Security headers, CORS, and cookie settings."""

    cors_allowed_origins: list[str] = Field(default_factory=list)
    trusted_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])
    access_token_cookie_name: str = Field(default="rakshika_access_token")
    refresh_token_cookie_name: str = Field(default="rakshika_refresh_token")
    secure_cookies: bool = False
    same_site: str = Field(default="lax")

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> list[str]:
        """Normalize comma-separated origins into a list."""

        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        raise TypeError("cors_allowed_origins must be a string or a list of strings")


class LoggingSettings(BaseModel):
    """Structured logging settings."""

    level: str = Field(default="INFO")
    json_logs: bool = True
    service_name: str = Field(default="rakshika-service")
    include_traceback: bool = True


class AppSettings(BaseSettings):
    """Process-wide application settings."""

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    app_name: str = Field(default="Rakshika")
    api_prefix: str = Field(default="/api/v1")
    environment: EnvironmentName = Field(default=EnvironmentName.DEVELOPMENT)
    debug: bool = False
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    jwt: JwtSettings = Field(default_factory=JwtSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)

    @field_validator("api_prefix")
    @classmethod
    def validate_prefix(cls, value: str) -> str:
        """Ensure the API prefix is normalized."""

        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"

    def is_production(self) -> bool:
        """Return whether the active environment is production."""

        return self.environment == EnvironmentName.PRODUCTION

    def validate_runtime_requirements(self) -> None:
        """Fail fast when mandatory runtime secrets are missing in production."""

        if self.is_production() and not self.jwt.secret_key:
            raise ValueError("JWT secret key must be configured in production")
        if self.is_production() and not self.database.url:
            raise ValueError("Database URL must be configured in production")


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    """Return a cached application settings instance."""

    settings = AppSettings()
    settings.validate_runtime_requirements()
    return settings
