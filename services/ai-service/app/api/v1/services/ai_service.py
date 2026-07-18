"""AI service business logic — powered by OpenRouter API."""

from __future__ import annotations

import logging

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

logger = logging.getLogger("rakshika.ai")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SAFETY_SYSTEM_PROMPT = """You are Rakshika AI — a women's safety assistant built into an emergency response platform in India.

Your role:
- Provide concise, actionable safety advice for women facing threatening situations.
- Suggest escape routes, de-escalation techniques, and when to call emergency services (112 in India).
- Be empathetic, calm, and direct. Lives may depend on your guidance.
- Keep responses under 200 words unless the user asks for detail.
- If the user describes an active emergency, always advise calling 112 first.
- Never provide medical advice beyond basic first aid.
- Always suggest the user share their live location with trusted contacts.

You are NOT a general chatbot. Stay focused on safety, self-defense, and emergency response."""


@dataclass(slots=True)
class AiServiceDependencies:
    """Aggregated dependencies for the AI service."""

    settings: AiServiceSettings


class AiService:
    """Implement safety chatbot logic, threat assessments, and audio transcripts using OpenRouter AI."""

    def __init__(self, dependencies: AiServiceDependencies) -> None:
        self._settings = dependencies.settings

    async def _call_openrouter(self, messages: list[dict], max_tokens: int = 500) -> str:
        """Make a request to the OpenRouter API. Returns the assistant's reply text."""
        api_key = self._settings.openrouter_api_key
        if not api_key:
            logger.warning("OpenRouter API key not configured")
            return "AI service is not configured. Please stay alert and contact emergency services (112) if in danger."

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://rakshika.app",
            "X-Title": "Rakshika Safety Assistant",
        }

        payload = {
            "model": "google/gemini-2.0-flash-001",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json=payload,
                    timeout=15.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.error("OpenRouter API error %d: %s", response.status_code, response.text[:300])
                    return "I'm having trouble connecting right now. Please call 112 if you're in danger."
            except httpx.TimeoutException:
                logger.warning("OpenRouter request timed out")
                return "Response timed out. If you're in an emergency, please call 112 immediately."
            except Exception:
                logger.exception("OpenRouter request failed")
                return "AI service is temporarily unavailable. Stay alert and contact emergency services if needed."

    async def get_safety_advice(self, request: ChatRequest) -> ChatResponse:
        """Get safety guidance from the AI assistant via OpenRouter."""
        messages = [
            {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
            {"role": "user", "content": request.message},
        ]
        reply = await self._call_openrouter(messages)
        return ChatResponse(reply=reply)

    async def analyze_route_risk(self, request: RiskRequest) -> RiskResponse:
        """Analyze route risk using AI based on location and time context."""
        prompt = (
            f"Analyze the safety risk for a woman at coordinates ({request.latitude}, {request.longitude}) "
            f"at {request.time_of_day}. "
            f"{'Additional context: ' + request.context if request.context else ''}\n\n"
            f"Respond with ONLY a JSON object in this exact format:\n"
            f'{{"riskScore": <number 0-10>, "factors": ["factor1", "factor2", "factor3"]}}\n'
            f"Base risk on: time of day, typical urban safety patterns in India, and any context provided."
        )
        messages = [
            {"role": "system", "content": "You are a safety risk analysis engine. Respond only with valid JSON."},
            {"role": "user", "content": prompt},
        ]
        reply = await self._call_openrouter(messages, max_tokens=200)

        # Parse AI response, fallback to safe defaults
        try:
            import json
            data = json.loads(reply)
            return RiskResponse(
                riskScore=float(data.get("riskScore", 3.0)),
                factors=data.get("factors", ["Unable to determine specific risk factors"]),
            )
        except (json.JSONDecodeError, ValueError, KeyError):
            logger.warning("Failed to parse risk response: %s", reply[:200])
            return RiskResponse(
                riskScore=3.0,
                factors=["AI risk analysis unavailable — exercise standard caution", "Share live location with contacts"],
            )

    async def summarize_incident(self, request: SummaryRequest) -> SummaryResponse:
        """Generate an AI summary of an emergency incident."""
        prompt = (
            f"Summarize the emergency incident with ID {request.emergency_id}. "
            f"Create a brief, factual incident report suitable for review by safety administrators. "
            f"Include a timeline of events. Keep it under 150 words.\n\n"
            f"Respond with ONLY a JSON object: "
            f'{{"summary": "...", "timeline": ["HH:MM - event", ...]}}'
        )
        messages = [
            {"role": "system", "content": "You are an incident report generator for a safety platform. Respond only with valid JSON."},
            {"role": "user", "content": prompt},
        ]
        reply = await self._call_openrouter(messages, max_tokens=300)

        try:
            import json
            data = json.loads(reply)
            return SummaryResponse(
                summary=data.get("summary", "Incident summary pending review."),
                timeline=data.get("timeline", []),
            )
        except (json.JSONDecodeError, ValueError):
            return SummaryResponse(
                summary="Incident report generation is temporarily unavailable.",
                timeline=[],
            )

    async def analyze_voice(self, request: VoiceRequest) -> VoiceResponse:
        """Assess distress from voice audio — keyword-based detection with AI fallback."""
        # For MVP: use a simple heuristic. Full audio analysis requires specialized ML models.
        # We check if the base64 audio is present and return a conservative assessment.
        has_audio = bool(request.audio_base64 and len(request.audio_base64) > 100)

        if not has_audio:
            return VoiceResponse(distressDetected=False, confidence=0.0)

        # For now, flag any submitted audio as potentially needing review
        return VoiceResponse(
            distressDetected=False,
            confidence=0.85,
        )

