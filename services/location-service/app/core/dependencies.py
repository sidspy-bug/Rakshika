"""Dependency providers for the location service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import LocationServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.location_service import LocationService, LocationServiceDependencies


async def get_location_service(request: Request) -> AsyncIterator[LocationService]:
    """Yield a per-request location service bound to a database session."""

    settings: LocationServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    async with database.session() as session:
        yield LocationService(
            LocationServiceDependencies(
                session=session,
                settings=settings,
            )
        )
