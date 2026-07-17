"""Location routes."""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends

from ....core.dependencies import get_location_service
from ..controllers.location_controller import LocationController
from ..schemas.location import LocationRead, LocationUpdateRequest, SafeRouteRead
from services.shared.dependencies import get_current_principal
from services.shared.security.authorization import Principal

router = APIRouter(tags=["Location"])


@router.post("/location/update", response_model=LocationRead)
async def update_location(
    payload: LocationUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_location_service),
) -> LocationRead:
    controller = LocationController(service)
    return await controller.update_location(principal, payload)


@router.get("/location/live/{emergencyId}", response_model=LocationRead)
async def get_live_location(
    emergencyId: UUID,
    service=Depends(get_location_service),
) -> LocationRead:
    controller = LocationController(service)
    return await controller.get_live_location(emergencyId)


@router.get("/location/history/{emergencyId}", response_model=list[LocationRead])
async def get_location_history(
    emergencyId: UUID,
    service=Depends(get_location_service),
) -> list[LocationRead]:
    controller = LocationController(service)
    return await controller.get_location_history(emergencyId)


@router.get("/location/safe-route", response_model=SafeRouteRead)
async def get_safe_route(
    service=Depends(get_location_service),
) -> SafeRouteRead:
    controller = LocationController(service)
    return await controller.get_safe_route()
