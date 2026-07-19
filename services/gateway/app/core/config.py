"""Gateway settings and route registry."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from functools import lru_cache

from pydantic import BaseModel, Field, field_validator

from services.shared.config.settings import AppSettings, EnvironmentName


class GatewayServiceName(str, Enum):
    """Downstream service names known to the gateway."""

    AUTH = "auth"
    USER = "user"
    EMERGENCY = "emergency"
    COMMUNITY = "community"
    LOCATION = "location"
    NOTIFICATION = "notification"
    EVIDENCE = "evidence"
    AI = "ai"


class DownstreamServiceSettings(BaseModel):
    """Connection settings for a downstream service."""

    base_url: str = Field(..., min_length=1)
    timeout_seconds: int = Field(default=30, ge=1)


class RateLimitSettings(BaseModel):
    """Redis-backed rate limiting settings."""

    enabled: bool = True
    requests: int = Field(default=120, ge=1)
    window_seconds: int = Field(default=60, ge=1)
    redis_key_prefix: str = "gateway:rate-limit"


class GatewaySettings(AppSettings):
    """Process-wide gateway settings."""

    app_name: str = "Rakshika Gateway"
    api_prefix: str = "/api/v1"
    environment: EnvironmentName = EnvironmentName.DEVELOPMENT
    auth_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://auth-service:8000")
    )
    user_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://user-service:8000")
    )
    emergency_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://emergency-service:8000")
    )
    community_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://community-service:8000")
    )
    location_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://location-service:8000")
    )
    notification_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://notification-service:8000")
    )
    evidence_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://evidence-service:8000")
    )
    ai_service: DownstreamServiceSettings = Field(
        default_factory=lambda: DownstreamServiceSettings(base_url="http://ai-service:8000")
    )
    rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)
    request_timeout_seconds: int = Field(default=30, ge=1)
    public_paths: list[str] = Field(
        default_factory=lambda: [
            "/api/v1/health",
            "/api/v1/auth/login",
            "/api/v1/auth/signup",
            "/api/v1/auth/refresh",
            "/api/v1/openapi-sources",
            "/api/v1/ai/chat",
        ]
    )
    openapi_sources: dict[str, str] = Field(
        default_factory=lambda: {
            "auth": "/openapi/auth-service.yaml",
            "user": "/openapi/user-service.yaml",
            "emergency": "/openapi/emergency-service.yaml",
            "community": "/openapi/community-service.yaml",
            "location": "/openapi/location-service.yaml",
            "notification": "/openapi/notification-service.yaml",
            "evidence": "/openapi/evidence-service.yaml",
            "ai": "/openapi/ai-service.yaml",
        }
    )

    @field_validator("api_prefix")
    @classmethod
    def normalize_prefix(cls, value: str) -> str:
        """Normalize the configured API prefix."""

        normalized = value.strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized.rstrip("/") or "/api/v1"


@dataclass(slots=True)
class RouteTarget:
    """Resolved downstream target for a gateway path."""

    service_name: GatewayServiceName
    base_url: str
    timeout_seconds: int


class RouteRegistry:
    """Resolve upstream routes to downstream services."""

    def __init__(self, settings: GatewaySettings) -> None:
        self._settings = settings

    def resolve(self, path: str) -> RouteTarget:
        """Resolve a normalized API path to a downstream target."""

        clean_path = path if path.startswith("/") else f"/{path}"
        if not clean_path.startswith(self._settings.api_prefix):
            raise ValueError(f"Unsupported gateway path: {path}")
        service_segment = clean_path.removeprefix(self._settings.api_prefix).lstrip("/").split("/", 1)[0]
        if service_segment == GatewayServiceName.AUTH.value:
            return RouteTarget(
                service_name=GatewayServiceName.AUTH,
                base_url=self._settings.auth_service.base_url,
                timeout_seconds=self._settings.auth_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.USER.value:
            return RouteTarget(
                service_name=GatewayServiceName.USER,
                base_url=self._settings.user_service.base_url,
                timeout_seconds=self._settings.user_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.EMERGENCY.value:
            return RouteTarget(
                service_name=GatewayServiceName.EMERGENCY,
                base_url=self._settings.emergency_service.base_url,
                timeout_seconds=self._settings.emergency_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.COMMUNITY.value:
            return RouteTarget(
                service_name=GatewayServiceName.COMMUNITY,
                base_url=self._settings.community_service.base_url,
                timeout_seconds=self._settings.community_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.LOCATION.value:
            return RouteTarget(
                service_name=GatewayServiceName.LOCATION,
                base_url=self._settings.location_service.base_url,
                timeout_seconds=self._settings.location_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.NOTIFICATION.value:
            return RouteTarget(
                service_name=GatewayServiceName.NOTIFICATION,
                base_url=self._settings.notification_service.base_url,
                timeout_seconds=self._settings.notification_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.EVIDENCE.value:
            return RouteTarget(
                service_name=GatewayServiceName.EVIDENCE,
                base_url=self._settings.evidence_service.base_url,
                timeout_seconds=self._settings.evidence_service.timeout_seconds,
            )
        if service_segment == GatewayServiceName.AI.value:
            return RouteTarget(
                service_name=GatewayServiceName.AI,
                base_url=self._settings.ai_service.base_url,
                timeout_seconds=self._settings.ai_service.timeout_seconds,
            )
        raise ValueError(f"No downstream service configured for path: {path}")

    def is_public(self, path: str) -> bool:
        """Return whether a path should bypass authentication."""

        normalized = path if path.startswith("/") else f"/{path}"
        return any(normalized == candidate or normalized.startswith(f"{candidate}/") for candidate in self._settings.public_paths)


@lru_cache(maxsize=1)
def get_settings() -> GatewaySettings:
    """Return the cached gateway settings."""

    return GatewaySettings()


@lru_cache(maxsize=1)
def get_route_registry() -> RouteRegistry:
    """Return the cached route registry."""

    return RouteRegistry(get_settings())
