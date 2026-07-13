"""SQLAlchemy base classes and reusable ORM mixins."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all shared models."""


class UUIDPrimaryKeyMixin:
    """Adds a UUID primary key column named id."""

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )


class TimestampMixin:
    """Adds created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Adds soft-delete support."""

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


def to_model_dict(instance: Any, *, exclude: set[str] | None = None) -> dict[str, Any]:
    """Extract a model-like object's public attributes into a dictionary."""

    excluded = exclude or set()
    return {
        key: value
        for key, value in vars(instance).items()
        if not key.startswith("_") and key not in excluded
    }
