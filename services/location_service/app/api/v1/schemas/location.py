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
    risk_level: str = Field(alias="riskLevel")
    waypoints: list = Field(default_factory=list)


class GeofenceCheckRequest(BaseSchema):
    """Coordinates and search boundary radius to evaluate geofence proximities."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_meters: float = Field(default=200.0, alias="radiusMeters", ge=10.0, le=5000.0)


class GeofenceStatusResponse(BaseSchema):
    """Proximity outcomes of threat zones and certified safe hubs."""

    is_in_danger_zone: bool = Field(default=False, alias="isInDangerZone")
    nearest_danger_distance: float | None = Field(default=None, alias="nearestDangerDistance")
    nearest_danger_title: str | None = Field(default=None, alias="nearestDangerTitle")
    
    is_in_safe_zone: bool = Field(default=False, alias="isInSafeZone")
    nearest_safe_distance: float | None = Field(default=None, alias="nearestSafeDistance")
    nearest_safe_name: str | None = Field(default=None, alias="nearestSafeName")

