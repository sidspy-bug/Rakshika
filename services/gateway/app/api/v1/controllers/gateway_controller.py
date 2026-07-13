"""Gateway controller layer."""

from __future__ import annotations

from fastapi import Request

from ..services.gateway_service import GatewayService


class GatewayController:
    """Thin controller layer that delegates to the service layer."""

    def __init__(self, service: GatewayService) -> None:
        self._service = service

    async def forward(self, request: Request, path: str) -> object:
        """Forward a request to the gateway service."""

        return await self._service.forward(request, path)

    async def health(self) -> dict[str, object]:
        """Return gateway health information."""

        return await self._service.health()

    async def openapi_sources(self) -> dict[str, str]:
        """Return downstream OpenAPI source mappings."""

        return await self._service.openapi_sources()
