"""User request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


# ── Profile Schemas ──────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseSchema):
    """Profile update payload."""

    avatar_url: str | None = Field(default=None, alias="avatarUrl", max_length=512)
    bio: str | None = Field(default=None, max_length=1000)
    date_of_birth: datetime | None = Field(default=None, alias="dateOfBirth")
    gender: str | None = Field(default=None, max_length=32)
    blood_group: str | None = Field(default=None, alias="bloodGroup", max_length=8)
    medical_conditions: str | None = Field(default=None, alias="medicalConditions", max_length=2000)
    allergies: str | None = Field(default=None, max_length=1000)
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=128)
    state: str | None = Field(default=None, max_length=128)
    pincode: str | None = Field(default=None, max_length=16)


class ProfileRead(UUIDSchema, TimestampSchema):
    """User profile response."""

    user_id: UUID = Field(alias="userId")
    avatar_url: str | None = Field(default=None, alias="avatarUrl")
    bio: str | None = None
    date_of_birth: datetime | None = Field(default=None, alias="dateOfBirth")
    gender: str | None = None
    blood_group: str | None = Field(default=None, alias="bloodGroup")
    medical_conditions: str | None = Field(default=None, alias="medicalConditions")
    allergies: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None


# ── Emergency Contact Schemas ────────────────────────────────────────────────

class ContactCreateRequest(BaseSchema):
    """Emergency contact creation payload."""

    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=7, max_length=32)
    relationship_type: str | None = Field(default=None, alias="relationshipType", max_length=64)
    email: EmailStr | None = None
    priority: int = Field(default=0, ge=0, le=100)
    notify_on_sos: bool = Field(default=True, alias="notifyOnSos")


class ContactUpdateRequest(BaseSchema):
    """Emergency contact update payload."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=7, max_length=32)
    relationship_type: str | None = Field(default=None, alias="relationshipType", max_length=64)
    email: EmailStr | None = None
    priority: int | None = Field(default=None, ge=0, le=100)
    notify_on_sos: bool | None = Field(default=None, alias="notifyOnSos")


class ContactRead(UUIDSchema, TimestampSchema):
    """Emergency contact response."""

    name: str
    phone: str
    relationship_type: str | None = Field(default=None, alias="relationshipType")
    email: str | None = None
    priority: int
    is_verified: bool = Field(alias="isVerified")
    notify_on_sos: bool = Field(alias="notifyOnSos")


# ── Preference Schemas ───────────────────────────────────────────────────────

class PreferenceUpdateRequest(BaseSchema):
    """User preference update payload."""

    language: str | None = Field(default=None, max_length=8)
    theme: str | None = Field(default=None, max_length=16)
    notifications_enabled: bool | None = Field(default=None, alias="notificationsEnabled")
    push_notifications: bool | None = Field(default=None, alias="pushNotifications")
    sms_notifications: bool | None = Field(default=None, alias="smsNotifications")
    email_notifications: bool | None = Field(default=None, alias="emailNotifications")
    location_sharing: bool | None = Field(default=None, alias="locationSharing")
    auto_record_on_sos: bool | None = Field(default=None, alias="autoRecordOnSos")
    community_visible: bool | None = Field(default=None, alias="communityVisible")
    shake_sensitivity: int | None = Field(default=None, alias="shakeSensitivity", ge=1, le=5)


class PreferenceRead(UUIDSchema):
    """User preference response."""

    language: str
    theme: str
    notifications_enabled: bool = Field(alias="notificationsEnabled")
    push_notifications: bool = Field(alias="pushNotifications")
    sms_notifications: bool = Field(alias="smsNotifications")
    email_notifications: bool = Field(alias="emailNotifications")
    location_sharing: bool = Field(alias="locationSharing")
    auto_record_on_sos: bool = Field(alias="autoRecordOnSos")
    community_visible: bool = Field(alias="communityVisible")
    shake_sensitivity: int = Field(alias="shakeSensitivity")
