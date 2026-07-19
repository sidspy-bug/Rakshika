"""Authentication domain ORM models."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, JSON, String, Table, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.shared.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", PostgreSQLUUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_id_role_id"),
)


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Authorization role."""

    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    users: Mapped[list["User"]] = relationship("User", secondary=user_roles, back_populates="roles")


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Authenticated user account."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("phone", name="uq_users_phone"),
        Index("ix_users_active_email", "email", unique=True),
        Index("ix_users_active_phone", "phone", unique=True),
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    is_email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    roles: Mapped[list[Role]] = relationship("Role", secondary=user_roles, back_populates="users", lazy="selectin")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    devices: Mapped[list["Device"]] = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Device(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Registered device used for session binding."""

    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("user_id", "device_fingerprint", name="uq_devices_user_fingerprint"),
        Index("ix_devices_user_id", "user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_fingerprint: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    os_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    app_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    push_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    trusted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="devices")


class Session(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Login session."""

    __tablename__ = "sessions"
    __table_args__ = (
        Index("ix_sessions_user_id", "user_id"),
        Index("ix_sessions_expires_at", "expires_at"),
    )

    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    session_jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, default=lambda: str(uuid4()))
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revocation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="sessions")
    device: Mapped[Device | None] = relationship("Device")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="session", cascade="all, delete-orphan")


class RefreshToken(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Refresh token record for rotation and revocation."""

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        UniqueConstraint("jti", name="uq_refresh_tokens_jti"),
        Index("ix_refresh_tokens_user_id", "user_id"),
        Index("ix_refresh_tokens_session_id", "session_id"),
        Index("ix_refresh_tokens_expires_at", "expires_at"),
    )

    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    jti: Mapped[str] = mapped_column(String(64), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_jti: Mapped[str | None] = mapped_column(String(64), nullable=True)
    token_family: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")
    session: Mapped[Session] = relationship("Session", back_populates="refresh_tokens")
    device: Mapped[Device | None] = relationship("Device")


class AuditLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Audit log record."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    user_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)

    user: Mapped[User | None] = relationship("User", back_populates="audit_logs")
