"""Location service business logic."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import LocationServiceSettings
from ..models.location import LocationUpdate, SafeRoute
from ..repositories.location_repository import LocationRepository
from ..schemas.location import LocationUpdateRequest


@dataclass(slots=True)
class LocationServiceDependencies:
    """Aggregated dependencies for the location service."""

    session: AsyncSession
    settings: LocationServiceSettings


class LocationService:
    """Implement live location telemetry and mapping logic."""

    def __init__(self, dependencies: LocationServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = LocationRepository(dependencies.session)
        self._settings = dependencies.settings

    async def update_location(self, user_id: UUID, request: LocationUpdateRequest) -> LocationUpdate:
        """Store a new location update breadcrumb."""

        update = await self._repository.create_location_update(
            user_id=user_id,
            emergency_id=request.emergency_id,
            latitude=request.latitude,
            longitude=request.longitude,
            accuracy=request.accuracy,
            speed=request.speed,
            heading=request.heading,
            battery_level=request.battery_level,
        )
        await self._repository.commit()
        return update

    async def get_live_location(self, emergency_id: UUID) -> LocationUpdate:
        """Return the single latest location coordinates logged for an active SOS."""

        loc = await self._repository.get_latest_location(emergency_id)
        if loc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No location recorded for this emergency")
        return loc

    async def get_location_history(self, emergency_id: UUID) -> list[LocationUpdate]:
        """Return all breadcrumbs logged during an SOS."""

        return await self._repository.get_location_history(emergency_id)

    async def get_safe_route(self) -> SafeRoute:
        """Return an active safe route recommendation."""

        routes = await self._repository.get_safe_routes()
        if not routes:
            # Fallback mock safe route for demo
            return SafeRoute(
                name="Green Corridor Route",
                description="High-density public street with active policing",
                risk_level="low",
                waypoints=[{"lat": 28.6139, "lng": 77.2090}, {"lat": 28.6145, "lng": 77.2105}],
            )
        return routes[0]

    async def check_geofence(self, latitude: float, longitude: float, radius_meters: float) -> dict:
        """Evaluate proximity checks to active threat zones and safety centers."""
        # 1. Proximity check for danger zones (active emergencies within radius)
        emergencies = await self._repository.get_nearby_active_emergencies(latitude, longitude, radius_meters)
        
        is_in_danger_zone = len(emergencies) > 0
        nearest_danger_distance = emergencies[0][1] if is_in_danger_zone else None
        nearest_danger_title = (
            f"Active emergency reported {round(emergencies[0][1])}m away"
            if is_in_danger_zone
            else None
        )

        # 2. Proximity check for safety zones
        route, safe_dist = await self._repository.get_nearest_safe_zone(latitude, longitude)
        
        is_in_safe_zone = safe_dist <= radius_meters
        nearest_safe_distance = safe_dist if route else None
        nearest_safe_name = route.name if route else None

        return {
            "isInDangerZone": is_in_danger_zone,
            "nearestDangerDistance": nearest_danger_distance,
            "nearestDangerTitle": nearest_danger_title,
            "isInSafeZone": is_in_safe_zone,
            "nearestSafeDistance": nearest_safe_distance,
            "nearestSafeName": nearest_safe_name,
        }

