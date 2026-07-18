"""Community domain ORM models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.shared.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class CommunityMember(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Registered community responder profile."""

    __tablename__ = "community_members"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_community_members_user_id"),
        Index("ix_community_members_user_id", "user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False, unique=True)
    availability_status: Mapped[str] = mapped_column(String(32), nullable=False, default="available")  # available, busy, offline
    responder_radius_km: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=3.0)
    
    # Last cached location of responder
    last_latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    last_longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    last_located_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EmergencyBroadcast(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """History of notifications sent out to the community for an SOS."""

    __tablename__ = "emergency_broadcasts"
    __table_args__ = (
        Index("ix_emergency_broadcasts_emergency_id", "emergency_id"),
    )

    emergency_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    radius_km: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    recipients_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ResponderAction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks responder accepts/declines/arrivals."""

    __tablename__ = "responder_actions"
    __table_args__ = (
        Index("ix_responder_actions_emergency_id", "emergency_id"),
        Index("ix_responder_actions_responder_id", "responder_id"),
    )

    emergency_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    responder_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)  # accepted, declined, on_way, arrived, cancelled
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
