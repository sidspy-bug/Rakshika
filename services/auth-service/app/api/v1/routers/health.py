"""Auth service health endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["Health"])


@router.get("/health", include_in_schema=False)
async def health(request: Request) -> dict[str, str]:
    settings = request.app.state.settings
    return {"service": settings.app_name, "status": "healthy"}
