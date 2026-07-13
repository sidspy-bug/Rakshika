"""Community request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


class MemberRegisterRequest(BaseSchema):
    """Payload to register a user as a community responder."""

    responder_radius_km: float = Field(default=3.0, alias="responderRadiusKm", ge=0.5, le=20.0)


class MemberStatusUpdateRequest(BaseSchema):
    """Payload to toggle responder availability."""

    availability_status: str = Field(..., alias="availabilityStatus")  # available, busy, offline


class MemberLocationUpdateRequest(BaseSchema):
    """Payload to record responder geo coordinates."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class ResponderActionRequest(BaseSchema):
    """Payload representing action taken by a responder."""

    emergency_id: UUID = Field(..., alias="emergencyId")
    action: str = Field(..., min_length=3, max_length=32)  # accepted, declined, on_way, arrived, cancelled
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class BroadcastRequest(BaseSchema):
    """Payload to trigger an emergency broadcast to nearby community members."""

    emergency_id: UUID = Field(..., alias="emergencyId")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_km: float | None = Field(default=None, alias="radiusKm")


class MemberRead(UUIDSchema, TimestampSchema):
    """Community member details."""

    user_id: UUID = Field(alias="userId")
    availability_status: str = Field(alias="availabilityStatus")
    responder_radius_km: float = Field(alias="responderRadiusKm")
    last_latitude: float | None = Field(default=None, alias="lastLatitude")
    last_longitude: float | None = Field(default=None, alias="lastLongitude")
    last_located_at: datetime | None = Field(default=None, alias="lastLocatedAt")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")


class BroadcastRead(UUIDSchema):
    """Broadcast details."""

    emergency_id: UUID = Field(alias="emergencyId")
    radius_km: float = Field(alias="radiusKm")
    recipients_count: int = Field(alias="recipientsCount")
    sent_at: datetime = Field(alias="sentAt")


class ActionRead(UUIDSchema):
    """Responder action details."""

    emergency_id: UUID = Field(alias="emergencyId")
    responder_id: UUID = Field(alias="responderId")
    action: str
    latitude: float
    longitude: float
    timestamp: datetime
