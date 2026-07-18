"""AI controller layer."""

from __future__ import annotations

from ..schemas.ai import (
    ChatRequest,
    ChatResponse,
    RiskRequest,
    RiskResponse,
    SummaryRequest,
    SummaryResponse,
    VoiceRequest,
    VoiceResponse,
)
from ..services.ai_service import AiService


class AiController:
    """Coordinate HTTP actions to the AI Service."""

    def __init__(self, service: AiService) -> None:
        self._service = service

    async def get_safety_advice(self, payload: ChatRequest) -> ChatResponse:
        return await self._service.get_safety_advice(payload)

    async def analyze_route_risk(self, payload: RiskRequest) -> RiskResponse:
        return await self._service.analyze_route_risk(payload)

    async def summarize_incident(self, payload: SummaryRequest) -> SummaryResponse:
        return await self._service.summarize_incident(payload)

    async def analyze_voice(self, payload: VoiceRequest) -> VoiceResponse:
        return await self._service.analyze_voice(payload)
