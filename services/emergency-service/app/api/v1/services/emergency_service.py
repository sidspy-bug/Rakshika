"""Emergency business logic."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from uuid import UUID

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import EmergencyServiceSettings
from ..models.emergency import Emergency, EmergencyStatusHistory
from ..repositories.emergency_repository import EmergencyRepository
from ..schemas.emergency import EmergencyStatusUpdateRequest, SosTriggerRequest, MeshRelayUploadRequest
from services.shared.utils.dates import now_utc

logger = logging.getLogger("rakshika.emergency")

# Redis Pub/Sub channel names
CHANNEL_EMERGENCY_CREATED = "events:emergency:created"
CHANNEL_EMERGENCY_STATUS_CHANGED = "events:emergency:status_changed"


@dataclass(slots=True)
class EmergencyServiceDependencies:
    """Aggregated dependencies for the emergency service."""

    session: AsyncSession
    settings: EmergencyServiceSettings
    redis_client: Redis | None = field(default=None)


class EmergencyService:
    """Implement SOS trigger, tracking, cancellation and resolution workflows."""

    def __init__(self, dependencies: EmergencyServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = EmergencyRepository(dependencies.session)
        self._settings = dependencies.settings
        self._redis = dependencies.redis_client

    async def _publish_event(self, channel: str, payload: dict) -> None:
        """Publish an event to a Redis Pub/Sub channel. Failures are logged but never block the SOS flow."""
        if self._redis is None:
            logger.warning("Redis not available — skipping event publish to %s", channel)
            return
        try:
            message = json.dumps(payload, default=str)
            await self._redis.publish(channel, message)
            logger.info("Published event to %s: emergency=%s", channel, payload.get("emergency_id"))
        except Exception:
            logger.exception("Failed to publish event to %s — SOS flow continues", channel)

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

        # Fan-out: notify downstream services asynchronously
        await self._publish_event(CHANNEL_EMERGENCY_CREATED, {
            "emergency_id": str(emergency.id),
            "user_id": str(user_id),
            "trigger_type": request.trigger_type,
            "severity": request.severity,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "address": request.address,
            "source": "direct",
            "timestamp": str(now_utc()),
        })

        return await self._repository.get_emergency_by_id(emergency.id)

    async def relay_upload(self, user_id: UUID, request: MeshRelayUploadRequest) -> Emergency:
        """Create a new active SOS emergency from a relayed mesh packet."""

        active = await self._repository.get_active_emergency_by_user_id(request.sender_id)
        if active is not None:
            return active  # Idempotent return of active SOS
            
        emergency = await self._repository.create_emergency(
            user_id=request.sender_id,
            trigger_type=request.trigger_type,
            severity=request.severity,
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
        )
        await self._repository.add_status_history(
            emergency_id=emergency.id,
            status="active",
            changed_by_user_id=request.sender_id,
            note=f"SOS Triggered via Mesh (hop count: {request.hop_count}, relayed by: {request.relayed_by})",
        )
        await self._repository.commit()

        # Fan-out: notify downstream services asynchronously
        await self._publish_event(CHANNEL_EMERGENCY_CREATED, {
            "emergency_id": str(emergency.id),
            "user_id": str(request.sender_id),
            "trigger_type": request.trigger_type,
            "severity": request.severity,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "address": request.address,
            "source": "mesh_relay",
            "hop_count": request.hop_count,
            "relayed_by": str(request.relayed_by),
            "timestamp": str(now_utc()),
        })

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

        # Fan-out: notify downstream services of status change
        await self._publish_event(CHANNEL_EMERGENCY_STATUS_CHANGED, {
            "emergency_id": str(emergency.id),
            "user_id": str(user_id),
            "new_status": target_status,
            "cancellation_reason": cancellation_reason,
            "timestamp": str(now_utc()),
        })

        return await self._repository.get_emergency_by_id(emergency.id)

    async def list_history(self, user_id: UUID) -> list[Emergency]:
        """Return all emergencies triggered by this user."""

        return await self._repository.list_emergency_history(user_id)
