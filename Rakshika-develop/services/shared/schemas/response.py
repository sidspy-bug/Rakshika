"""Standard API response models."""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import Field

from .base import BaseSchema

T = TypeVar("T")


class ErrorResponseDetail(BaseSchema):
    """Structured error detail."""

    code: str
    message: str
    field: str | None = None


class ErrorResponse(BaseSchema):
    """Standard error response envelope."""

    success: bool = False
    message: str
    details: list[ErrorResponseDetail] = Field(default_factory=list)
    request_id: str | None = None
    trace_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ApiResponse(BaseSchema, Generic[T]):
    """Standard success response envelope."""

    success: bool = True
    message: str | None = None
    data: T | None = None
    request_id: str | None = None
    trace_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
