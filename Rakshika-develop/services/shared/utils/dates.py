"""Datetime helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def now_utc() -> datetime:
    """Return the current UTC datetime with timezone information."""

    return datetime.now(timezone.utc)


def to_utc(value: datetime) -> datetime:
    """Convert a datetime to UTC."""

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def add_minutes(value: datetime, minutes: int) -> datetime:
    """Add minutes to a datetime in UTC-aware form."""

    return to_utc(value) + timedelta(minutes=minutes)


def add_days(value: datetime, days: int) -> datetime:
    """Add days to a datetime in UTC-aware form."""

    return to_utc(value) + timedelta(days=days)


def is_past(value: datetime) -> bool:
    """Return whether the value is in the past."""

    return to_utc(value) < now_utc()


def is_future(value: datetime) -> bool:
    """Return whether the value is in the future."""

    return to_utc(value) > now_utc()
