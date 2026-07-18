"""Location domain ORM models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, JSON, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.shared.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LocationUpdate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Live location breadcrumbs tracked during active SOS emergencies."""

    __tablename__ = "location_updates"
    __table_args__ = (
        Index("ix_location_updates_emergency_id", "emergency_id"),
        Index("ix_location_updates_timestamp", "timestamp"),
    )

    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    emergency_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=True)
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    accuracy: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    speed: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    heading: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SafeRoute(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Pre-calculated safe routes or safety zones."""

    __tablename__ = "safe_routes"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False, default="low")
    waypoints: Mapped[dict] = mapped_column(JSON, nullable=False, default=list) # Waypoint geo coordinates
