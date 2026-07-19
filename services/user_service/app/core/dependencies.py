"""Dependency providers for the user service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import UserServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.user_service import UserService, UserServiceDependencies


async def get_user_service(request: Request) -> AsyncIterator[UserService]:
    """Yield a per-request user service bound to a database session."""

    settings: UserServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    async with database.session() as session:
        yield UserService(
            UserServiceDependencies(
                session=session,
                settings=settings,
            )
        )
