"""Community business logic."""

from __future__ import annotations

import math
from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import CommunityServiceSettings
from ..models.community import CommunityMember, EmergencyBroadcast, ResponderAction
from ..repositories.community_repository import CommunityRepository
from ..schemas.community import (
    BroadcastRequest,
    MemberLocationUpdateRequest,
    MemberRegisterRequest,
    MemberStatusUpdateRequest,
    ResponderActionRequest,
)


@dataclass(slots=True)
class CommunityServiceDependencies:
    """Aggregated dependencies for the community service."""

    session: AsyncSession
    settings: CommunityServiceSettings


class CommunityService:
    """Implement responder registration, spatial radius lookups, broadcasts and response actions."""

    def __init__(self, dependencies: CommunityServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = CommunityRepository(dependencies.session)
        self._settings = dependencies.settings

    async def register_member(self, user_id: UUID, request: MemberRegisterRequest) -> CommunityMember:
        """Register a new user as a community responder."""

        existing = await self._repository.get_member_by_user_id(user_id)
        if existing is not None:
            return existing
        member = await self._repository.create_member(user_id, radius_km=request.responder_radius_km)
        await self._repository.commit()
        return member

    async def update_status(self, user_id: UUID, request: MemberStatusUpdateRequest) -> CommunityMember:
        """Toggle responder availability."""

        member = await self._repository.get_member_by_user_id(user_id)
        if member is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community member not registered")
        updated = await self._repository.update_member_status(member, request.availability_status)
        await self._repository.commit()
        return updated

    async def update_location(self, user_id: UUID, request: MemberLocationUpdateRequest) -> CommunityMember:
        """Cache current geo coordinates of responder."""

        member = await self._repository.get_member_by_user_id(user_id)
        if member is None:
            # Auto-register with default settings on location update
            member = await self._repository.create_member(user_id, radius_km=self._settings.community.default_radius_km)
            
        updated = await self._repository.update_member_location(member, request.latitude, request.longitude)
        await self._repository.commit()
        return updated

    async def get_nearby_responders(self, lat: float, lng: float, radius_km: float | None = None) -> list[CommunityMember]:
        """Find all available responders within a specific radial distance."""

        limit_radius = radius_km or self._settings.community.default_radius_km
        all_avail = await self._repository.list_available_responders()
        
        nearby = []
        for m in all_avail:
            if m.last_latitude is not None and m.last_longitude is not None:
                # Basic Haversine distance
                distance = self._haversine_distance(lat, lng, float(m.last_latitude), float(m.last_longitude))
                if distance <= limit_radius:
                    nearby.append(m)
        return nearby

    async def broadcast_emergency(self, request: BroadcastRequest) -> EmergencyBroadcast:
        """Log a broadcast to nearby responders."""

        radius = request.radius_km or self._settings.community.default_radius_km
        nearby = await self.get_nearby_responders(request.latitude, request.longitude, radius)
        
        broadcast = await self._repository.create_broadcast(
            request.emergency_id,
            radius_km=radius,
            recipients_count=len(nearby),
        )
        await self._repository.commit()
        return broadcast

    async def record_action(self, user_id: UUID, request: ResponderActionRequest) -> ResponderAction:
        """Record responder feedback during active SOS tracking."""

        action = await self._repository.record_action(
            responder_id=user_id,
            emergency_id=request.emergency_id,
            action=request.action,
            lat=request.latitude,
            lng=request.longitude,
        )
        await self._repository.commit()
        return action

    async def get_actions_for_emergency(self, emergency_id: UUID) -> list[ResponderAction]:
        """Retrieve all feedback logs for a specific emergency."""

        return await self._repository.list_actions_for_emergency(emergency_id)

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Return distance between coordinates in kilometers."""

        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
