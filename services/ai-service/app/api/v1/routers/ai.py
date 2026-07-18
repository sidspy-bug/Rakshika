"""AI routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ....core.dependencies import get_ai_service
from ..controllers.ai_controller import AiController
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

router = APIRouter(tags=["AI"])


@router.post("/ai/chat", response_model=ChatResponse)
async def safety_chat(
    payload: ChatRequest,
    service=Depends(get_ai_service),
) -> ChatResponse:
    controller = AiController(service)
    return await controller.get_safety_advice(payload)


@router.post("/ai/risk", response_model=RiskResponse)
async def risk_analysis(
    payload: RiskRequest,
    service=Depends(get_ai_service),
) -> RiskResponse:
    controller = AiController(service)
    return await controller.analyze_route_risk(payload)


@router.post("/ai/summary", response_model=SummaryResponse)
async def incident_summary(
    payload: SummaryRequest,
    service=Depends(get_ai_service),
) -> SummaryResponse:
    controller = AiController(service)
    return await controller.summarize_incident(payload)


@router.post("/ai/voice-analysis", response_model=VoiceResponse)
async def voice_analysis(
    payload: VoiceRequest,
    service=Depends(get_ai_service),
) -> VoiceResponse:
    controller = AiController(service)
    return await controller.analyze_voice(payload)
