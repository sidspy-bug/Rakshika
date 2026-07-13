"""Location request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


class LocationUpdateRequest(BaseSchema):
    """Payload to push a single location ping."""

    emergency_id: UUID | None = Field(default=None, alias="emergencyId")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy: float | None = Field(default=None)
    speed: float | None = Field(default=None)
    heading: float | None = Field(default=None)
    battery_level: int | None = Field(default=None, alias="batteryLevel", ge=0, le=100)


class LocationRead(UUIDSchema, TimestampSchema):
    """Location update details."""

    user_id: UUID = Field(alias="userId")
    emergency_id: UUID | None = Field(default=None, alias="emergencyId")
    latitude: float
    longitude: float
    accuracy: float | None = None
    speed: float | None = None
    heading: float | None = None
    battery_level: int | None = Field(default=None, alias="batteryLevel")
    timestamp: datetime


class SafeRouteRead(UUIDSchema):
    """Safe route details."""

    name: str
    description: str | None = None
    risk_level: Mapped[str] = Field(alias="riskLevel")
    waypoints: list = Field(default_factory=list)
