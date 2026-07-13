"""Emergency data access layer."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.emergency import Emergency, EmergencyResponse, EmergencyStatusHistory
from services.shared.utils.dates import now_utc


class EmergencyRepository:
    """Async repository for SOS-related database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_emergency_by_id(self, emergency_id: UUID) -> Emergency | None:
        """Return detailed emergency record."""

        query = (
            select(Emergency)
            .where(Emergency.id == emergency_id, Emergency.deleted_at.is_(None))
            .options(
                selectinload(Emergency.status_history),
                selectinload(Emergency.responses),
            )
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_active_emergency_by_user_id(self, user_id: UUID) -> Emergency | None:
        """Return user's currently active emergency, if any."""

        query = (
            select(Emergency)
            .where(
                Emergency.user_id == user_id,
                Emergency.status == "active",
                Emergency.deleted_at.is_(None),
            )
            .options(
                selectinload(Emergency.status_history),
                selectinload(Emergency.responses),
            )
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def list_emergency_history(self, user_id: UUID) -> list[Emergency]:
        """Return history of emergencies for a user."""

        query = (
            select(Emergency)
            .where(Emergency.user_id == user_id, Emergency.deleted_at.is_(None))
            .options(
                selectinload(Emergency.status_history),
                selectinload(Emergency.responses),
            )
            .order_by(Emergency.started_at.desc())
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def create_emergency(
        self,
        user_id: UUID,
        *,
        trigger_type: str,
        severity: str,
        latitude: float,
        longitude: float,
        address: str | None = None,
    ) -> Emergency:
        """Create a new SOS entry."""

        emergency = Emergency(
            user_id=user_id,
            trigger_type=trigger_type,
            severity=severity,
            latitude=latitude,
            longitude=longitude,
            address=address,
            started_at=now_utc(),
        )
        self._session.add(emergency)
        await self._session.flush()
        return emergency

    async def update_emergency_status(self, emergency: Emergency, status: str, resolved_at: datetime | None = None, cancellation_reason: str | None = None) -> Emergency:
        """Update overall status of an SOS."""

        emergency.status = status
        if resolved_at:
            emergency.resolved_at = resolved_at
        if cancellation_reason:
            emergency.cancellation_reason = cancellation_reason
        emergency.updated_at = now_utc()
        await self._session.flush()
        return emergency

    async def add_status_history(self, emergency_id: UUID, *, status: str, changed_by_user_id: UUID, note: str | None = None) -> EmergencyStatusHistory:
        """Log state transition details."""

        history = EmergencyStatusHistory(
            emergency_id=emergency_id,
            status=status,
            changed_by_user_id=changed_by_user_id,
            note=note,
        )
        self._session.add(history)
        await self._session.flush()
        return history

    async def commit(self) -> None:
        """Commit current transaction."""
        await self._session.commit()
