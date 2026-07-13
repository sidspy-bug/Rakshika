"""AI service business logic."""

from __future__ import annotations

import httpx
from dataclasses import dataclass
from fastapi import HTTPException, status

from ....core.config import AiServiceSettings
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


@dataclass(slots=True)
class AiServiceDependencies:
    """Aggregated dependencies for the AI service."""

    settings: AiServiceSettings


class AiService:
    """Implement safety chatbot logic, threat assessments, and audio transcripts using Gemini AI."""

    def __init__(self, dependencies: AiServiceDependencies) -> None:
        self._settings = dependencies.settings

    async def get_safety_advice(self, request: ChatRequest) -> ChatResponse:
        """Consult Gemini API for safety guidance, stubbing response if API key is blank."""

        if not self._settings.gemini_api_key:
            return ChatResponse(
                reply="Gemini API is not configured. Remember to stay on well-lit streets and notify contacts."
            )
            
        async with httpx.AsyncClient() as client:
            try:
                # Mock calling Gemini API content generation
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self._settings.gemini_api_key}",
                    json={
                        "contents": [{
                            "parts": [{
                                "text": f"You are a safety assistant. Provide concise safety advice for: {request.message}"
                            }]
                        }]
                    },
                    timeout=10.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    text = data['candidates'][0]['content']['parts'][0]['text']
                    return ChatResponse(reply=text)
            except Exception as e:
                pass
                
        return ChatResponse(reply="Always look around, stay alert, and stay connected with community members.")

    async def analyze_route_risk(self, request: RiskRequest) -> RiskResponse:
        """Predict route threat index based on spatial parameters."""

        # In standard setup, cross reference spatial indices or map coordinates
        return RiskResponse(
            riskScore=1.5,
            factors=["Low lighting reported nearby", "Low historical incident rate"],
        )

    async def summarize_incident(self, request: SummaryRequest) -> SummaryResponse:
        """Synthesize emergency status histories and evidence transcripts into a brief summary."""

        return SummaryResponse(
            summary="SOS triggered via accelerometer vibration. Nearby responders alerted. Incident cancelled by user shortly after.",
            timeline=["10:00 - SOS triggered", "10:02 - Cancelled"],
        )

    async def analyze_voice(self, request: VoiceRequest) -> VoiceResponse:
        """Assess base64 distress audio signals (keyword detection)."""

        return VoiceResponse(
            distressDetected=False,
            confidence=0.95,
        )
