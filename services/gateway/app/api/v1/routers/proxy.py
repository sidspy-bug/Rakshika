"""Catch-all proxy route for versioned downstream forwarding."""

from __future__ import annotations

from fastapi import APIRouter, Request

from ..controllers.gateway_controller import GatewayController

router = APIRouter(tags=["Gateway"], include_in_schema=False)


def _controller(request: Request) -> GatewayController:
    return request.app.state.gateway_controller


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str) -> object:
    """Forward the request to the configured downstream service."""

    if path in {"health", "openapi-sources"}:
        return {"detail": "Not found"}
    return await _controller(request).forward(request, path)
