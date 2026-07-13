"""Dependency providers for the evidence service."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request

from .config import EvidenceServiceSettings
from .database import DatabaseBundle
from ..api.v1.services.evidence_service import EvidenceService, EvidenceServiceDependencies


async def get_evidence_service(request: Request) -> AsyncIterator[EvidenceService]:
    """Yield a per-request evidence service bound to a database session."""

    settings: EvidenceServiceSettings = request.app.state.settings
    database: DatabaseBundle = request.app.state.db
    async with database.session() as session:
        yield EvidenceService(
            EvidenceServiceDependencies(
                session=session,
                settings=settings,
            )
        )
