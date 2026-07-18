"""Dependency providers for the community service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import CommunityServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.community_service import CommunityService, CommunityServiceDependencies


async def get_community_service(request: Request) -> AsyncIterator[CommunityService]:
    """Yield a per-request community service bound to a database session."""

    settings: CommunityServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    async with database.session() as session:
        yield CommunityService(
            CommunityServiceDependencies(
                session=session,
                settings=settings,
            )
        )
