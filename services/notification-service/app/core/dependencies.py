"""Dependency providers for the notification service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import NotificationServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.notification_service import NotificationService, NotificationServiceDependencies


async def get_notification_service(request: Request) -> AsyncIterator[NotificationService]:
    """Yield a per-request notification service bound to a database session."""

    settings: NotificationServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    async with database.session() as session:
        yield NotificationService(
            NotificationServiceDependencies(
                session=session,
                settings=settings,
            )
        )
