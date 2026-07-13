"""Emergency controller layer."""

from __future__ import annotations

from uuid import UUID

from ..schemas.emergency import EmergencyRead, EmergencyStatusUpdateRequest, SosTriggerRequest
from ..services.emergency_service import EmergencyService
from services.shared.security.authorization import Principal


class EmergencyController:
    """Coordinate HTTP actions to the Emergency Service."""

    def __init__(self, service: EmergencyService) -> None:
        self._service = service

    async def trigger_sos(self, principal: Principal, payload: SosTriggerRequest) -> EmergencyRead:
        emergency = await self._service.trigger_sos(principal.user_id, payload)
        return EmergencyRead.model_validate(emergency)

    async def get_emergency(self, principal: Principal, emergency_id: UUID) -> EmergencyRead:
        emergency = await self._service.get_emergency(emergency_id, principal.user_id)
        return EmergencyRead.model_validate(emergency)

    async def update_status(self, principal: Principal, emergency_id: UUID, payload: EmergencyStatusUpdateRequest) -> EmergencyRead:
        emergency = await self._service.update_status(emergency_id, principal.user_id, payload)
        return EmergencyRead.model_validate(emergency)

    async def list_history(self, principal: Principal) -> list[EmergencyRead]:
        emergencies = await self._service.list_history(principal.user_id)
        return [EmergencyRead.model_validate(e) for e in emergencies]
