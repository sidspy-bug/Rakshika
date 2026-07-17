"""Common Pydantic base schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """Base model for API schemas."""

    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class UUIDSchema(BaseSchema):
    """Base schema with an identifier."""

    id: UUID = Field(..., description="Entity UUID")


class TimestampSchema(BaseSchema):
    """Base schema with timestamp metadata."""

    created_at: datetime | None = Field(default=None)
    updated_at: datetime | None = Field(default=None)


class SoftDeleteSchema(BaseSchema):
    """Base schema for soft delete support."""

    deleted_at: datetime | None = Field(default=None)
