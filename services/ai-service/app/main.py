"""Rakshika AI service application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from services.shared.exceptions import register_exception_handlers
from services.shared.logging.structured import configure_logging
from services.shared.middleware import RequestContextMiddleware, SecurityHeadersMiddleware

from .api.v1.routers.health import router as health_router
from .api.v1.routers.ai import router as ai_router
from .core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Setup and teardown resources."""
    settings = get_settings()
    configure_logging(settings.logging)
    logger = logging.getLogger("rakshika.ai")
    
    app.state.settings = settings
    
    logger.info("AI service resources initialized")
    try:
        yield
    finally:
        logger.info("AI service resources released")


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
app.include_router(ai_router, prefix=settings.api_prefix)


@app.get("/health", include_in_schema=False)
async def root_health() -> dict[str, str]:
    """Expose a non-versioned health probe for infrastructure use."""
    return {"status": "ok"}
