"""Notification request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


class PushNotificationRequest(BaseSchema):
    """Payload to send a push notification."""

    user_id: UUID = Field(..., alias="userId")
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    data: dict | None = Field(default=None)


class SmsNotificationRequest(BaseSchema):
    """Payload to send an SMS."""

    phone: str = Field(..., min_length=7, max_length=32)
    message: str = Field(..., min_length=1, max_length=500)


class EmailNotificationRequest(BaseSchema):
    """Payload to send an email."""

    email: str = Field(..., min_length=3, max_length=255)
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)


class NotificationRead(UUIDSchema, TimestampSchema):
    """Notification log details."""

    user_id: UUID = Field(alias="userId")
    notification_type: str = Field(alias="notificationType")
    title: str
    body: str
    status: str
    data_payload: dict | None = Field(default=None, alias="data")
    sent_at: datetime = Field(alias="sentAt")
    read_at: datetime | None = Field(default=None, alias="readAt")
