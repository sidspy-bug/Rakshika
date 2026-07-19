"""Community routes."""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, Request

from ....core.dependencies import get_community_service
from ..controllers.community_controller import CommunityController
from ..schemas.community import (
    ActionRead,
    BroadcastRead,
    BroadcastRequest,
    MemberLocationUpdateRequest,
    MemberRead,
    MemberRegisterRequest,
    MemberStatusUpdateRequest,
    ResponderActionRequest,
)
from services.shared.dependencies import get_current_principal
from services.shared.security.authorization import Principal

router = APIRouter(tags=["Community"])


@router.post("/community/register", response_model=MemberRead, status_code=201)
async def register_member(
    payload: MemberRegisterRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_community_service),
) -> MemberRead:
    controller = CommunityController(service)
    return await controller.register_member(principal, payload)


@router.put("/community/status", response_model=MemberRead)
async def update_status(
    payload: MemberStatusUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_community_service),
) -> MemberRead:
    controller = CommunityController(service)
    return await controller.update_status(principal, payload)


@router.post("/community/location", response_model=MemberRead)
async def update_location(
    payload: MemberLocationUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_community_service),
) -> MemberRead:
    controller = CommunityController(service)
    return await controller.update_location(principal, payload)


@router.get("/community/nearby", response_model=list[MemberRead])
async def get_nearby_responders(
    latitude: float,
    longitude: float,
    radiusKm: float | None = None,
    service=Depends(get_community_service),
) -> list[MemberRead]:
    controller = CommunityController(service)
    return await controller.get_nearby_responders(latitude, longitude, radiusKm)


@router.post("/community/broadcast", response_model=BroadcastRead)
async def broadcast_emergency(
    payload: BroadcastRequest,
    service=Depends(get_community_service),
) -> BroadcastRead:
    controller = CommunityController(service)
    return await controller.broadcast_emergency(payload)


@router.post("/community/respond", response_model=ActionRead)
async def record_action(
    payload: ResponderActionRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_community_service),
) -> ActionRead:
    controller = CommunityController(service)
    return await controller.record_action(principal, payload)


@router.get("/community/responders", response_model=list[ActionRead])
async def get_actions_for_emergency(
    emergencyId: UUID,
    service=Depends(get_community_service),
) -> list[ActionRead]:
    controller = CommunityController(service)
    return await controller.get_actions_for_emergency(emergencyId)
