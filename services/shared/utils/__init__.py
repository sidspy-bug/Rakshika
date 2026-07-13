"""Shared utilities."""

from .dates import add_days, add_minutes, is_future, is_past, now_utc, to_utc
from .health import HealthCheckResult, HealthStatus, build_health_result
from .ids import ensure_uuid, new_uuid, normalize_uuid
from .validation import is_email, is_phone_number, password_policy_violations

__all__ = [
    "add_days",
    "add_minutes",
    "ensure_uuid",
    "HealthCheckResult",
    "HealthStatus",
    "build_health_result",
    "is_email",
    "is_future",
    "is_past",
    "is_phone_number",
    "new_uuid",
    "normalize_uuid",
    "now_utc",
    "password_policy_violations",
    "to_utc",
]
