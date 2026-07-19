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

    async def get_nearest_safe_zone(self, latitude: float, longitude: float) -> tuple[SafeRoute | None, float]:
        """Return the closest safe route/zone and its distance in meters using PostGIS SQL functions."""
        from sqlalchemy import text

        query = text("""
            SELECT id, name, description, risk_level, waypoints,
                   ST_DistanceSphere(
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                       ST_SetSRID(ST_MakePoint(
                           CAST(waypoints->0->>'lng' AS DOUBLE PRECISION), 
                           CAST(waypoints->0->>'lat' AS DOUBLE PRECISION)
                       ), 4326)
                   ) as distance_meters
            FROM safe_routes
            ORDER BY distance_meters ASC
            LIMIT 1
        """)

        result = await self._session.execute(query, {"lat": latitude, "lng": longitude})
        row = result.first()
        if not row:
            return None, float("inf")

        route = SafeRoute(
            id=row.id,
            name=row.name,
            description=row.description,
            risk_level=row.risk_level,
            waypoints=row.waypoints,
        )
        return route, float(row.distance_meters)

    async def get_nearby_active_emergencies(self, latitude: float, longitude: float, radius_meters: float) -> list[tuple[LocationUpdate, float]]:
        """Query active emergency location updates within a specific radius using PostGIS ST_DistanceSphere."""
        from sqlalchemy import text

        query = text("""
            WITH latest_updates AS (
                SELECT DISTINCT ON (emergency_id) emergency_id, latitude, longitude, timestamp, id
                FROM location_updates
                WHERE emergency_id IS NOT NULL
                ORDER BY emergency_id, timestamp DESC
            )
            SELECT id, emergency_id, latitude, longitude, timestamp,
                   ST_DistanceSphere(
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                   ) as distance_meters
            FROM latest_updates
            WHERE ST_DistanceSphere(
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
            ) <= :radius
            ORDER BY distance_meters ASC
        """)

        result = await self._session.execute(query, {"lat": latitude, "lng": longitude, "radius": radius_meters})
        rows = result.all()

        output = []
        for row in rows:
            loc = LocationUpdate(
                id=row.id,
                emergency_id=row.emergency_id,
                latitude=row.latitude,
                longitude=row.longitude,
                timestamp=row.timestamp,
            )
            output.append((loc, float(row.distance_meters)))
        return output

    async def commit(self) -> None:
        """Commit current transaction."""
        await self._session.commit()

