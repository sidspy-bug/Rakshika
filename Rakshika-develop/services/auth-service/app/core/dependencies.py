"""Dependency providers for the auth service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import AuthServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.auth_service import AuthService, AuthServiceDependencies


async def get_auth_service(request: Request) -> AsyncIterator[AuthService]:
    """Yield a per-request auth service bound to a database session."""

    settings: AuthServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    async with database.session() as session:
        yield AuthService(
            AuthServiceDependencies(
                session=session,
                settings=settings,
                redis_client=request.app.state.redis_client,
            )
        )
