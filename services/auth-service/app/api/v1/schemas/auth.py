"""Authentication request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


class DeviceContext(BaseSchema):
    """Client device metadata used during session creation."""

    fingerprint: str = Field(min_length=8, max_length=255)
    name: str | None = Field(default=None, max_length=255)
    platform: str | None = Field(default=None, max_length=64)
    model: str | None = Field(default=None, max_length=128)
    os_version: str | None = Field(default=None, max_length=64)
    app_version: str | None = Field(default=None, max_length=32)
    push_token: str | None = Field(default=None, max_length=512)


class RegisterRequest(BaseSchema):
    """Account creation payload."""

    full_name: str = Field(min_length=2, max_length=255, alias="fullName")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str = Field(min_length=7, max_length=32)
    device: DeviceContext | None = None
    accept_terms: bool = Field(default=True, alias="acceptTerms")


class LoginRequest(BaseSchema):
    """Login payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    device: DeviceContext | None = None


class RefreshRequest(BaseSchema):
    """Refresh token exchange payload."""

    refresh_token: str | None = Field(default=None, alias="refreshToken")


class LogoutRequest(BaseSchema):
    """Logout payload."""

    refresh_token: str | None = Field(default=None, alias="refreshToken")
    session_id: UUID | None = Field(default=None, alias="sessionId")


class RoleRead(UUIDSchema):
    """Role response payload."""

    name: str
    description: str | None = None


class SessionRead(UUIDSchema):
    """Session response payload."""

    session_jti: str = Field(alias="sessionJti")
    device_id: UUID | None = Field(default=None, alias="deviceId")
    expires_at: datetime = Field(alias="expiresAt")
    revoked_at: datetime | None = Field(default=None, alias="revokedAt")
    last_seen_at: datetime | None = Field(default=None, alias="lastSeenAt")


class UserRead(UUIDSchema, TimestampSchema):
    """Authenticated user profile."""

    full_name: str = Field(alias="fullName")
    email: EmailStr
    phone: str
    status: str
    is_email_verified: bool = Field(alias="isEmailVerified")
    is_phone_verified: bool = Field(alias="isPhoneVerified")
    last_login_at: datetime | None = Field(default=None, alias="lastLoginAt")
    roles: list[RoleRead] = Field(default_factory=list)


class TokenPairResponse(BaseSchema):
    """Issued token pair."""

    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    access_expires_at: int = Field(alias="accessExpiresAt")
    refresh_expires_at: int = Field(alias="refreshExpiresAt")
    session_id: UUID = Field(alias="sessionId")
    device_id: UUID | None = Field(default=None, alias="deviceId")


class AuthResponse(BaseSchema):
    """Authentication result payload."""

    user: UserRead
    tokens: TokenPairResponse
    email_verification_required: bool = Field(alias="emailVerificationRequired")


class MeResponse(BaseSchema):
    """Current user response payload."""

    user: UserRead
    session: SessionRead | None = None
