"""Evidence controller layer."""

from __future__ import annotations

from uuid import UUID
from fastapi import UploadFile

from ..schemas.evidence import EvidenceRead
from ..services.evidence_service import EvidenceService
from services.shared.security.authorization import Principal


class EvidenceController:
    """Coordinate HTTP actions to the Evidence Service."""

    def __init__(self, service: EvidenceService) -> None:
        self._service = service

    async def upload_evidence(
        self,
        principal: Principal,
        emergency_id: UUID,
        file: UploadFile,
        evidence_type: str,
        metadata: dict | None = None,
    ) -> EvidenceRead:
        evidence = await self._service.upload_evidence(emergency_id, principal.user_id, file, evidence_type, metadata)
        return EvidenceRead.model_validate(evidence)

    async def get_evidence(self, evidence_id: UUID) -> EvidenceRead:
        evidence = await self._service.get_evidence(evidence_id)
        return EvidenceRead.model_validate(evidence)

    async def delete_evidence(self, evidence_id: UUID) -> None:
        await self._service.delete_evidence(evidence_id)
