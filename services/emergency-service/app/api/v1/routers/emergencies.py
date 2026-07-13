"""Emergency routers."""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, Request

from ....core.dependencies import get_emergency_service
from ..controllers.emergency_controller import EmergencyController
from ..schemas.emergency import EmergencyRead, EmergencyStatusUpdateRequest, SosTriggerRequest
from services.shared.dependencies import get_current_principal
from services.shared.security.authorization import Principal

router = APIRouter(tags=["Emergencies"])


@router.post("/emergencies/sos", response_model=EmergencyRead, status_code=201)
async def trigger_sos(
    payload: SosTriggerRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_emergency_service),
) -> EmergencyRead:
    controller = EmergencyController(service)
    return await controller.trigger_sos(principal, payload)


@router.get("/emergencies/history", response_model=list[EmergencyRead])
async def list_history(
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_emergency_service),
) -> list[EmergencyRead]:
    controller = EmergencyController(service)
    return await controller.list_history(principal)


@router.get("/emergencies/{emergencyId}", response_model=EmergencyRead)
async def get_emergency(
    emergencyId: UUID,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_emergency_service),
) -> EmergencyRead:
    controller = EmergencyController(service)
    return await controller.get_emergency(principal, emergencyId)


@router.post("/emergencies/{emergencyId}/cancel", response_model=EmergencyRead)
async def cancel_emergency(
    emergencyId: UUID,
    payload: EmergencyStatusUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_emergency_service),
) -> EmergencyRead:
    # Ensure status is set to cancelled
    payload.status = "cancelled"
    controller = EmergencyController(service)
    return await controller.update_status(principal, emergencyId, payload)


@router.patch("/emergencies/{emergencyId}/status", response_model=EmergencyRead)
async def update_status(
    emergencyId: UUID,
    payload: EmergencyStatusUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_emergency_service),
) -> EmergencyRead:
    controller = EmergencyController(service)
    return await controller.update_status(principal, emergencyId, payload)
