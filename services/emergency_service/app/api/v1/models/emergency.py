"""Emergency domain ORM models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.shared.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Emergency(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Active or past SOS emergency record."""

    __tablename__ = "emergencies"
    __table_args__ = (
        Index("ix_emergencies_user_id", "user_id"),
        Index("ix_emergencies_status", "status"),
    )

    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(64), nullable=False)  # shake, tap, voice, button
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")  # active, cancelled, resolved
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")  # low, medium, high, critical
    
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status_history: Mapped[list["EmergencyStatusHistory"]] = relationship(
        "EmergencyStatusHistory", back_populates="emergency", cascade="all, delete-orphan",
    )
    responses: Mapped[list["EmergencyResponse"]] = relationship(
        "EmergencyResponse", back_populates="emergency", cascade="all, delete-orphan",
    )


class EmergencyStatusHistory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks state transitions of an emergency."""

    __tablename__ = "emergency_status_history"
    __table_args__ = (
        Index("ix_emergency_status_history_emergency_id", "emergency_id"),
    )

    emergency_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("emergencies.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    changed_by_user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    emergency: Mapped[Emergency] = relationship("Emergency", back_populates="status_history")


class EmergencyResponse(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks community members responding to an SOS."""

    __tablename__ = "emergency_responses"
    __table_args__ = (
        UniqueConstraint("emergency_id", "responder_id", name="uq_emergency_responses_emergency_responder"),
        Index("ix_emergency_responses_emergency_id", "emergency_id"),
        Index("ix_emergency_responses_responder_id", "responder_id"),
    )

    emergency_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("emergencies.id", ondelete="CASCADE"),
        nullable=False,
    )
    responder_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="accepted")  # accepted, on_way, arrived, cancelled
    
    # Responder initial location when accepted
    initial_latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    initial_longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    
    distance_meters: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    estimated_arrival_minutes: Mapped[float | None] = mapped_column(Numeric(5, 1), nullable=True)
    
    responded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    emergency: Mapped[Emergency] = relationship("Emergency", back_populates="responses")
