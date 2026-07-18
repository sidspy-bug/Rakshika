"""User domain ORM models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.shared.database.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UserProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Extended user profile linked to the auth user."""

    __tablename__ = "user_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
        Index("ix_user_profiles_user_id", "user_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False, unique=True
    )
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    medical_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    state: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(16), nullable=True)

    emergency_contacts: Mapped[list["EmergencyContact"]] = relationship(
        "EmergencyContact", back_populates="profile", cascade="all, delete-orphan",
        order_by="EmergencyContact.priority",
    )
    preferences: Mapped["UserPreference | None"] = relationship(
        "UserPreference", back_populates="profile", uselist=False, cascade="all, delete-orphan",
    )


class EmergencyContact(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Emergency contact for a user."""

    __tablename__ = "emergency_contacts"
    __table_args__ = (
        Index("ix_emergency_contacts_profile_id", "profile_id"),
    )

    profile_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    relationship_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notify_on_sos: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    profile: Mapped[UserProfile] = relationship("UserProfile", back_populates="emergency_contacts")


class UserPreference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User application preferences."""

    __tablename__ = "user_preferences"
    __table_args__ = (
        UniqueConstraint("profile_id", name="uq_user_preferences_profile_id"),
    )

    profile_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    language: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    theme: Mapped[str] = mapped_column(String(16), nullable=False, default="system")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    push_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sms_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    location_sharing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_record_on_sos: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    community_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    shake_sensitivity: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    profile: Mapped[UserProfile] = relationship("UserPreference", back_populates="preferences", viewonly=True)
