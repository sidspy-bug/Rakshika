"""Location controller layer."""

from __future__ import annotations

from uuid import UUID

from ..schemas.location import LocationRead, LocationUpdateRequest, SafeRouteRead
from ..services.location_service import LocationService
from services.shared.security.authorization import Principal


class LocationController:
    """Coordinate HTTP actions to the Location Service."""

    def __init__(self, service: LocationService) -> None:
        self._service = service

    async def update_location(self, principal: Principal, payload: LocationUpdateRequest) -> LocationRead:
        update = await self._service.update_location(principal.user_id, payload)
        return LocationRead.model_validate(update)

    async def get_live_location(self, emergency_id: UUID) -> LocationRead:
        update = await self._service.get_live_location(emergency_id)
        return LocationRead.model_validate(update)

    async def get_location_history(self, emergency_id: UUID) -> list[LocationRead]:
        updates = await self._service.get_location_history(emergency_id)
        return [LocationRead.model_validate(u) for u in updates]

    async def get_safe_route(self) -> SafeRouteRead:
        route = await self._service.get_safe_route()
        return SafeRouteRead.model_validate(route)
