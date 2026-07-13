"""Rakshika API gateway application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from services.shared.exceptions import register_exception_handlers
from services.shared.logging.structured import configure_logging
from services.shared.middleware import RequestContextMiddleware, SecurityHeadersMiddleware

from .api.v1.controllers.gateway_controller import GatewayController
from .api.v1.repositories.gateway_repository import GatewayRepository
from .api.v1.routers.health import router as health_router
from .api.v1.routers.proxy import router as proxy_router
from .api.v1.services.gateway_service import GatewayDependencies, GatewayService
from .core.config import GatewaySettings, get_route_registry, get_settings
from .core.rate_limiter import RedisRateLimiter
from .core.security import GatewaySecurityGuard
from services.shared.database.redis import RedisManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build and tear down gateway infrastructure resources."""

    settings = get_settings()
    configure_logging(settings.logging)
    logger = logging.getLogger("rakshika.gateway")
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(settings.request_timeout_seconds), follow_redirects=False)
    redis_client = None
    if settings.rate_limit.enabled:
        try:
            redis_client = RedisManager.from_settings(settings.redis).client
            await redis_client.ping()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis rate limiting is disabled", extra={"error": str(exc)})
            if redis_client is not None:
                await redis_client.aclose()
            redis_client = None
    route_registry = get_route_registry()
    security_guard = GatewaySecurityGuard(settings=settings, route_registry=route_registry)
    rate_limiter = RedisRateLimiter(settings=settings, redis_client=redis_client)
    repository = GatewayRepository(client=http_client)
    service = GatewayService(
        GatewayDependencies(
            repository=repository,
            security_guard=security_guard,
            rate_limiter=rate_limiter,
            settings=settings,
            redis_client=redis_client,
            route_registry=route_registry,
        )
    )
    app.state.settings = settings
    app.state.http_client = http_client
    app.state.redis_client = redis_client
    app.state.gateway_service = service
    app.state.gateway_controller = GatewayController(service)
    try:
        yield
    finally:
        await http_client.aclose()
        if redis_client is not None:
            await redis_client.aclose()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.security.trusted_hosts or ["*"])
if settings.security.cors_allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

register_exception_handlers(app)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(proxy_router, prefix=settings.api_prefix)


@app.get("/health", include_in_schema=False)
async def root_health() -> dict[str, str]:
    """Expose a non-versioned health probe for infrastructure use."""

    return {"status": "ok"}
"""Gateway entrypoint placeholder."""
