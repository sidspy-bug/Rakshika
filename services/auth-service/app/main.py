"""Rakshika auth service application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from services.shared.database.redis import RedisManager
from services.shared.exceptions import register_exception_handlers
from services.shared.logging.structured import configure_logging
from services.shared.middleware import RequestContextMiddleware, SecurityHeadersMiddleware

from .api.v1.controllers.auth_controller import AuthController
from .api.v1.routers.auth import router as auth_router
from .api.v1.routers.health import router as health_router
from .core.config import get_settings
from .core.database import DatabaseBundle


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.logging)
    logger = logging.getLogger("rakshika.auth")
    db = DatabaseBundle.from_settings(settings.database)
    redis_client = None
    try:
        redis_client = RedisManager.from_settings(settings.redis).client
        await redis_client.ping()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis is unavailable for auth workflows", extra={"error": str(exc)})
        if redis_client is not None:
            await redis_client.aclose()
        redis_client = None

    app.state.settings = settings
    app.state.db = db
    app.state.redis_client = redis_client
    try:
        yield
    finally:
        await db.dispose()
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
app.include_router(auth_router, prefix=settings.api_prefix)
"""Auth service entrypoint placeholder."""
