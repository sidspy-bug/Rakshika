"""Community controller layer."""

from __future__ import annotations

from uuid import UUID

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
from ..services.community_service import CommunityService
from services.shared.security.authorization import Principal


class CommunityController:
    """Coordinate Community Service interactions."""

    def __init__(self, service: CommunityService) -> None:
        self._service = service

    async def register_member(self, principal: Principal, payload: MemberRegisterRequest) -> MemberRead:
        member = await self._service.register_member(principal.user_id, payload)
        return MemberRead.model_validate(member)

    async def update_status(self, principal: Principal, payload: MemberStatusUpdateRequest) -> MemberRead:
        member = await self._service.update_status(principal.user_id, payload)
        return MemberRead.model_validate(member)

    async def update_location(self, principal: Principal, payload: MemberLocationUpdateRequest) -> MemberRead:
        member = await self._service.update_location(principal.user_id, payload)
        return MemberRead.model_validate(member)

    async def get_nearby_responders(self, lat: float, lng: float, radius: float | None = None) -> list[MemberRead]:
        members = await self._service.get_nearby_responders(lat, lng, radius)
        return [MemberRead.model_validate(m) for m in members]

    async def broadcast_emergency(self, payload: BroadcastRequest) -> BroadcastRead:
        broadcast = await self._service.broadcast_emergency(payload)
        return BroadcastRead.model_validate(broadcast)

    async def record_action(self, principal: Principal, payload: ResponderActionRequest) -> ActionRead:
        action = await self._service.record_action(principal.user_id, payload)
        return ActionRead.model_validate(action)

    async def get_actions_for_emergency(self, emergency_id: UUID) -> list[ActionRead]:
        actions = await self._service.get_actions_for_emergency(emergency_id)
        return [ActionRead.model_validate(a) for a in actions]
