"""Gateway health and metadata routes."""

from __future__ import annotations

from fastapi import APIRouter, Request

from ..controllers.gateway_controller import GatewayController

router = APIRouter(tags=["Gateway"])


def _controller(request: Request) -> GatewayController:
    return request.app.state.gateway_controller


@router.get("/health", response_model=None)
async def health(request: Request) -> dict[str, object]:
    """Return gateway health information."""

    return await _controller(request).health()


@router.get("/openapi-sources", response_model=None, include_in_schema=False)
async def openapi_sources(request: Request) -> dict[str, str]:
    """Return downstream OpenAPI source metadata for future aggregation."""

    return await _controller(request).openapi_sources()
