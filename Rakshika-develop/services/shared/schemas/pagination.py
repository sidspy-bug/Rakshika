"""Pagination schemas."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import Field, field_validator

from ..constants.app import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from .base import BaseSchema

T = TypeVar("T")


class PaginationParams(BaseSchema):
    """Common pagination request parameters."""

    page: int = Field(default=1, ge=1)
    size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)

    @field_validator("size")
    @classmethod
    def validate_size(cls, value: int) -> int:
        """Ensure the page size remains bounded."""

        if value > MAX_PAGE_SIZE:
            return MAX_PAGE_SIZE
        return value


class PaginationMeta(BaseSchema):
    """Pagination metadata for list responses."""

    page: int
    size: int
    total: int
    pages: int


class Page(BaseSchema, Generic[T]):
    """Generic paginated response payload."""

    items: list[T]
    meta: PaginationMeta
