"""Emergency request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


class SosTriggerRequest(BaseSchema):
    """Payload to trigger a new SOS emergency."""

    trigger_type: str = Field(..., alias="triggerType", min_length=2, max_length=64)
    severity: str = Field(default="medium", min_length=3, max_length=32)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: str | None = Field(default=None, max_length=500)


class EmergencyStatusUpdateRequest(BaseSchema):
    """Payload to transition status of an SOS."""

    status: str = Field(..., min_length=3, max_length=32)  # active, cancelled, resolved
    cancellation_reason: str | None = Field(default=None, alias="cancellationReason", max_length=255)
    note: str | None = Field(default=None, max_length=255)


class StatusHistoryRead(UUIDSchema, TimestampSchema):
    """Response payload for status transitions."""

    status: str
    changed_by_user_id: UUID = Field(alias="changedByUserId")
    note: str | None = None


class ResponseRead(UUIDSchema, TimestampSchema):
    """Response payload for responder details."""

    responder_id: UUID = Field(alias="responderId")
    status: str
    initial_latitude: float = Field(alias="initialLatitude")
    initial_longitude: float = Field(alias="initialLongitude")
    distance_meters: float | None = Field(default=None, alias="distanceMeters")
    estimated_arrival_minutes: float | None = Field(default=None, alias="estimatedArrivalMinutes")
    responded_at: datetime = Field(alias="respondedAt")
    arrived_at: datetime | None = Field(default=None, alias="arrivedAt")


class EmergencyRead(UUIDSchema, TimestampSchema):
    """Detailed emergency response payload."""

    user_id: UUID = Field(alias="userId")
    trigger_type: str = Field(alias="triggerType")
    status: str
    severity: str
    latitude: float
    longitude: float
    address: str | None = None
    started_at: datetime = Field(alias="startedAt")
    resolved_at: datetime | None = Field(default=None, alias="resolvedAt")
    cancellation_reason: str | None = Field(default=None, alias="cancellationReason")
    status_history: list[StatusHistoryRead] = Field(default_factory=list, alias="statusHistory")
    responses: list[ResponseRead] = Field(default_factory=list)
