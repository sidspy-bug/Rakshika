"""Emergency business logic."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import EmergencyServiceSettings
from ..models.emergency import Emergency, EmergencyStatusHistory
from ..repositories.emergency_repository import EmergencyRepository
from ..schemas.emergency import EmergencyStatusUpdateRequest, SosTriggerRequest
from services.shared.utils.dates import now_utc


@dataclass(slots=True)
class EmergencyServiceDependencies:
    """Aggregated dependencies for the emergency service."""

    session: AsyncSession
    settings: EmergencyServiceSettings


class EmergencyService:
    """Implement SOS trigger, tracking, cancellation and resolution workflows."""

    def __init__(self, dependencies: EmergencyServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = EmergencyRepository(dependencies.session)
        self._settings = dependencies.settings

    async def trigger_sos(self, user_id: UUID, request: SosTriggerRequest) -> Emergency:
        """Create a new active SOS emergency, validating no active one exists."""

        active = await self._repository.get_active_emergency_by_user_id(user_id)
        if active is not None:
            return active  # Idempotent return of active SOS
            
        emergency = await self._repository.create_emergency(
            user_id=user_id,
            trigger_type=request.trigger_type,
            severity=request.severity,
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
        )
        await self._repository.add_status_history(
            emergency_id=emergency.id,
            status="active",
            changed_by_user_id=user_id,
            note="SOS Triggered",
        )
        await self._repository.commit()
        return await self._repository.get_emergency_by_id(emergency.id)

    async def get_emergency(self, emergency_id: UUID, user_id: UUID) -> Emergency:
        """Retrieve details of an emergency."""

        emergency = await self._repository.get_emergency_by_id(emergency_id)
        if emergency is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency not found")
        # Allow checking if the caller is the victim or a responder/admin (stub roles check)
        return emergency

    async def update_status(self, emergency_id: UUID, user_id: UUID, request: EmergencyStatusUpdateRequest) -> Emergency:
        """Advance the status of an emergency (cancel or resolve)."""

        emergency = await self._repository.get_emergency_by_id(emergency_id)
        if emergency is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency not found")
        
        target_status = request.status.lower()
        if target_status not in ["active", "cancelled", "resolved"]:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid emergency status")
            
        resolved_at = now_utc() if target_status == "resolved" else None
        cancellation_reason = request.cancellation_reason if target_status == "cancelled" else None
        
        await self._repository.update_emergency_status(
            emergency=emergency,
            status=target_status,
            resolved_at=resolved_at,
            cancellation_reason=cancellation_reason,
        )
        await self._repository.add_status_history(
            emergency_id=emergency.id,
            status=target_status,
            changed_by_user_id=user_id,
            note=request.note or f"Status updated to {target_status}",
        )
        await self._repository.commit()
        return await self._repository.get_emergency_by_id(emergency.id)

    async def list_history(self, user_id: UUID) -> list[Emergency]:
        """Return all emergencies triggered by this user."""

        return await self._repository.list_emergency_history(user_id)
