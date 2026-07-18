"""Location data access layer."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.location import LocationUpdate, SafeRoute
from services.shared.utils.dates import now_utc


class LocationRepository:
    """Async repository for location tracking database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_location_update(
        self,
        user_id: UUID,
        *,
        emergency_id: UUID | None,
        latitude: float,
        longitude: float,
        accuracy: float | None = None,
        speed: float | None = None,
        heading: float | None = None,
        battery_level: int | None = None,
    ) -> LocationUpdate:
        """Log a new location coordinate ping."""

        update = LocationUpdate(
            user_id=user_id,
            emergency_id=emergency_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            speed=speed,
            heading=heading,
            battery_level=battery_level,
            timestamp=now_utc(),
        )
        self._session.add(update)
        await self._session.flush()
        return update

    async def get_latest_location(self, emergency_id: UUID) -> LocationUpdate | None:
        """Return the latest location update for an active emergency."""

        query = (
            select(LocationUpdate)
            .where(LocationUpdate.emergency_id == emergency_id)
            .order_by(LocationUpdate.timestamp.desc())
            .limit(1)
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_location_history(self, emergency_id: UUID) -> list[LocationUpdate]:
        """Return all breadcrumbs logged for an emergency."""

        query = (
            select(LocationUpdate)
            .where(LocationUpdate.emergency_id == emergency_id)
            .order_by(LocationUpdate.timestamp.asc())
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def get_safe_routes(self) -> list[SafeRoute]:
        """List pre-calculated safe routes."""

        query = select(SafeRoute)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        """Commit current transaction."""
        await self._session.commit()
