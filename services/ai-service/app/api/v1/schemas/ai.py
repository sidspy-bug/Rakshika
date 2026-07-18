"""AI request and response schemas."""

from __future__ import annotations

from pydantic import Field

from services.shared.schemas.base import BaseSchema


class ChatRequest(BaseSchema):
    """Payload to query safety advice."""

    message: str = Field(..., min_length=1)


class ChatResponse(BaseSchema):
    """Reply from safety assistant."""

    reply: str


class RiskRequest(BaseSchema):
    """Payload to score safety routing risks."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    time_of_day: str = Field(..., alias="timeOfDay")
    context: str | None = Field(default=None)


class RiskResponse(BaseSchema):
    """Risk score result."""

    risk_score: float = Field(alias="riskScore") # 0.0 to 10.0 scale
    factors: list[str] = Field(default_factory=list)


class SummaryRequest(BaseSchema):
    """Payload to summarize logs of an incident."""

    emergency_id: str = Field(..., alias="emergencyId")


class SummaryResponse(BaseSchema):
    """Resulting incident summary."""

    summary: str
    timeline: list[str] = Field(default_factory=list)


class VoiceRequest(BaseSchema):
    """Payload for voice audio stream distress analysis."""

    audio_base64: str = Field(..., alias="audioBase64")


class VoiceResponse(BaseSchema):
    """Voice distress classification."""

    distress_detected: bool = Field(alias="distressDetected")
    confidence: float
