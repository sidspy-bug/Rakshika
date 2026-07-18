"""Community data access layer."""

from __future__ import annotations

from uuid import UUID
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.community import CommunityMember, EmergencyBroadcast, ResponderAction
from services.shared.utils.dates import now_utc


class CommunityRepository:
    """Async repository for community response database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Community Members ───────────────────────────────────────────────────

    async def get_member_by_user_id(self, user_id: UUID) -> CommunityMember | None:
        """Return the community member registration for a user."""

        query = select(CommunityMember).where(
            CommunityMember.user_id == user_id,
            CommunityMember.deleted_at.is_(None),
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def create_member(self, user_id: UUID, *, radius_km: float) -> CommunityMember:
        """Register a user as a responder."""

        member = CommunityMember(
            user_id=user_id,
            responder_radius_km=radius_km,
            availability_status="available",
        )
        self._session.add(member)
        await self._session.flush()
        return member

    async def update_member_status(self, member: CommunityMember, status: str) -> CommunityMember:
        """Toggle responder availability status."""

        member.availability_status = status
        member.updated_at = now_utc()
        await self._session.flush()
        return member

    async def update_member_location(self, member: CommunityMember, lat: float, lng: float) -> CommunityMember:
        """Cache current coordinates of a responder."""

        member.last_latitude = lat
        member.last_longitude = lng
        member.last_located_at = now_utc()
        member.updated_at = now_utc()
        await self._session.flush()
        return member

    async def list_available_responders(self) -> list[CommunityMember]:
        """List active available responders with cached locations."""

        query = select(CommunityMember).where(
            CommunityMember.availability_status == "available",
            CommunityMember.last_latitude.is_not(None),
            CommunityMember.last_longitude.is_not(None),
            CommunityMember.deleted_at.is_(None),
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    # ── Broadcasts ──────────────────────────────────────────────────────────

    async def create_broadcast(self, emergency_id: UUID, *, radius_km: float, recipients_count: int) -> EmergencyBroadcast:
        """Create a history log of emergency broadcasts."""

        broadcast = EmergencyBroadcast(
            emergency_id=emergency_id,
            radius_km=radius_km,
            recipients_count=recipients_count,
            sent_at=now_utc(),
        )
        self._session.add(broadcast)
        await self._session.flush()
        return broadcast

    # ── Actions ─────────────────────────────────────────────────────────────

    async def record_action(self, responder_id: UUID, emergency_id: UUID, *, action: str, lat: float, lng: float) -> ResponderAction:
        """Record granular actions taken by a responder."""

        action_record = ResponderAction(
            emergency_id=emergency_id,
            responder_id=responder_id,
            action=action,
            latitude=lat,
            longitude=lng,
            timestamp=now_utc(),
        )
        self._session.add(action_record)
        await self._session.flush()
        return action_record

    async def list_actions_for_emergency(self, emergency_id: UUID) -> list[ResponderAction]:
        """List all responder actions for a specific emergency."""

        query = select(ResponderAction).where(ResponderAction.emergency_id == emergency_id).order_by(ResponderAction.timestamp.desc())
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        """Commit active transaction."""
        await self._session.commit()
