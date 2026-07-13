"""Dependency providers for the AI service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import AiServiceSettings
from ..api.v1.services.ai_service import AiService, AiServiceDependencies


async def get_ai_service(request: Request) -> AsyncIterator[AiService]:
    """Yield a per-request AI service."""

    settings: AiServiceSettings = request.app.state.settings
    yield AiService(
        AiServiceDependencies(
            settings=settings,
        )
    )
