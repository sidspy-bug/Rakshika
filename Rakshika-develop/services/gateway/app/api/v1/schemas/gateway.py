"""Gateway response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from services.shared.schemas.base import BaseSchema


class GatewayHealthResponse(BaseSchema):
    """Health endpoint payload."""

    service: str
    status: str
    environment: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    redis: str | None = None
    downstream_services: list[str] = Field(default_factory=list)


class OpenApiSourcesResponse(BaseSchema):
    """OpenAPI aggregation metadata payload."""

    sources: dict[str, str]
