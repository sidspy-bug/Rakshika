"""Gateway service layer."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
from fastapi import HTTPException, Request, Response, status
from redis.asyncio import Redis

from services.shared.constants.app import HEADER_REQUEST_ID, HEADER_TRACE_ID
from services.shared.logging.context import RequestContext, set_request_context
from services.shared.security.authorization import Principal
from services.shared.utils.health import HealthStatus

from ....core.config import GatewaySettings, RouteRegistry
from ....core.proxy import build_proxy_request
from ....core.rate_limiter import RedisRateLimiter
from ....core.security import AuthenticatedRequest, GatewaySecurityGuard
from ..repositories.gateway_repository import GatewayRepository


@dataclass(slots=True)
class GatewayDependencies:
    """Aggregated gateway dependencies."""

    repository: GatewayRepository
    security_guard: GatewaySecurityGuard
    rate_limiter: RedisRateLimiter
    settings: GatewaySettings
    redis_client: Redis | None
    route_registry: RouteRegistry


class GatewayService:
    """Coordinate auth, rate limiting, and downstream forwarding."""

    def __init__(self, dependencies: GatewayDependencies) -> None:
        self._dependencies = dependencies
        self._logger = logging.getLogger("rakshika.gateway")

    async def forward(self, request: Request, path: str) -> Response:
        """Authenticate, rate-limit, and forward a request."""

        await self._dependencies.security_guard.authenticate(request)
        await self._dependencies.rate_limiter.enforce(request)
        try:
            target = self._dependencies.route_registry.resolve(
                f"{self._dependencies.settings.api_prefix}/{path}" if path else self._dependencies.settings.api_prefix
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No downstream route configured") from exc
        request_id = request.headers.get(HEADER_REQUEST_ID) or request.state.__dict__.get("request_id") or "unknown"
        trace_id = request.headers.get(HEADER_TRACE_ID) or request.state.__dict__.get("trace_id") or "unknown"
        set_request_context(
            RequestContext(
                request_id=request_id,
                trace_id=trace_id,
                user_id=str(getattr(getattr(request.state, "principal", None), "user_id", "")) or None,
                session_id=str(getattr(getattr(request.state, "principal", None), "session_id", "")) or None,
                path=request.url.path,
                method=request.method,
            )
        )
        body = await request.body()
        proxy_request = build_proxy_request(
            request,
            self._build_upstream_url(target.base_url, path),
            request_id=request_id,
            trace_id=trace_id,
            body=body,
        )
        auth_context = getattr(request.state, "principal", None)
        if isinstance(auth_context, Principal):
            proxy_request.headers["x-authenticated-user-id"] = str(auth_context.user_id)
            proxy_request.headers["x-authenticated-roles"] = ",".join(sorted(auth_context.roles))
            proxy_request.headers["x-authenticated-permissions"] = ",".join(sorted(auth_context.permissions))
            if auth_context.session_id is not None:
                proxy_request.headers["x-authenticated-session-id"] = str(auth_context.session_id)
            if auth_context.device_id is not None:
                proxy_request.headers["x-authenticated-device-id"] = str(auth_context.device_id)
        try:
            upstream_response = await self._dependencies.repository.forward(proxy_request)
        except httpx.TimeoutException as exc:
            raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Downstream service timed out") from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Downstream service unavailable") from exc
        return Response(
            content=upstream_response.body,
            status_code=upstream_response.status_code,
            headers=upstream_response.headers,
            media_type=upstream_response.headers.get("content-type"),
        )

    async def health(self) -> dict[str, object]:
        """Return operational health data."""

        redis_status = "unavailable"
        if self._dependencies.redis_client is not None:
            try:
                await self._dependencies.redis_client.ping()
                redis_status = HealthStatus.HEALTHY.value
            except Exception:  # noqa: BLE001
                redis_status = HealthStatus.DEGRADED.value
        return {
            "service": self._dependencies.settings.app_name,
            "status": HealthStatus.HEALTHY.value,
            "environment": self._dependencies.settings.environment.value,
            "redis": redis_status,
            "downstream_services": sorted(self._dependencies.settings.openapi_sources.keys()),
        }

    async def openapi_sources(self) -> dict[str, str]:
        """Return the configured downstream OpenAPI source mapping."""

        return self._dependencies.settings.openapi_sources

    @staticmethod
    def _build_upstream_url(base_url: str, path: str) -> str:
        """Combine the downstream base URL and request path including api prefix."""

        clean_path = path.lstrip("/")
        return f"{base_url.rstrip('/')}/api/v1/{clean_path}"
