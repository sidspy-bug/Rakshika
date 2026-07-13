"""Rakshika community service application."""

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

from .api.v1.routers.community import router as community_router
from .api.v1.routers.health import router as health_router
from .core.config import get_settings
from .core.database import DatabaseBundle


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Setup and teardown database resources."""
    settings = get_settings()
    configure_logging(settings.logging)
    logger = logging.getLogger("rakshika.community")
    
    db = DatabaseBundle.from_settings(settings.database)
    
    app.state.settings = settings
    app.state.db = db
    
    logger.info("Community service resources initialized")
    try:
        yield
    finally:
        await db.dispose()
        logger.info("Community service resources released")


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
app.include_router(community_router, prefix=settings.api_prefix)


@app.get("/health", include_in_schema=False)
async def root_health() -> dict[str, str]:
    """Expose a non-versioned health probe for infrastructure use."""
    return {"status": "ok"}
