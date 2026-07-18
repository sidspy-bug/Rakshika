"""Health check helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class HealthStatus(str, Enum):
    """Health status values."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass(slots=True)
class HealthCheckResult:
    """Represents the state of a subsystem health probe."""

    name: str
    status: HealthStatus
    details: dict[str, Any] = field(default_factory=dict)


def build_health_result(name: str, status: HealthStatus, **details: Any) -> HealthCheckResult:
    """Create a normalized health check result."""

    return HealthCheckResult(name=name, status=status, details=details)
