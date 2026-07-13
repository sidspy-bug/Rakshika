"""UUID helpers."""

from __future__ import annotations

from uuid import UUID, uuid4


def new_uuid() -> UUID:
    """Return a new random UUID4."""

    return uuid4()


def normalize_uuid(value: str | UUID) -> str:
    """Normalize a UUID-like value to its canonical string form."""

    return str(ensure_uuid(value))


def ensure_uuid(value: str | UUID) -> UUID:
    """Validate and coerce a UUID-like value."""

    if isinstance(value, UUID):
        return value
    return UUID(str(value))
