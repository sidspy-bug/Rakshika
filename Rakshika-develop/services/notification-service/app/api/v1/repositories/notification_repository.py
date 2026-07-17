"""Notification data access layer."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import Notification
from services.shared.utils.dates import now_utc


class NotificationRepository:
    """Async repository for alerts and dispatch logs."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def log_notification(
        self,
        user_id: UUID,
        *,
        notification_type: str,
        title: str,
        body: str,
        status: str = "sent",
        data: dict | None = None,
    ) -> Notification:
        """Create a notification audit record."""

        notif = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            body=body,
            status=status,
            data_payload=data,
            sent_at=now_utc(),
        )
        self._session.add(notif)
        await self._session.flush()
        return notif

    async def list_notifications(self, user_id: UUID) -> list[Notification]:
        """List past notifications sent to a user."""

        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.sent_at.desc())
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        """Commit current transaction."""
        await self._session.commit()
