"""Dependency providers for the emergency service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import EmergencyServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.emergency_service import EmergencyService, EmergencyServiceDependencies


async def get_emergency_service(request: Request) -> AsyncIterator[EmergencyService]:
    """Yield a per-request emergency service bound to a database session."""

    settings: EmergencyServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    redis_client = getattr(request.app.state, "redis_client", None)
    async with database.session() as session:
        yield EmergencyService(
            EmergencyServiceDependencies(
                session=session,
                settings=settings,
                redis_client=redis_client,
            )
        )

