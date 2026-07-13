"""Evidence business logic."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import EvidenceServiceSettings
from ..models.evidence import Evidence
from ..repositories.evidence_repository import EvidenceRepository


@dataclass(slots=True)
class EvidenceServiceDependencies:
    """Aggregated dependencies for the evidence service."""

    session: AsyncSession
    settings: EvidenceServiceSettings


class EvidenceService:
    """Implement evidence upload tracking and integration with storage containers."""

    def __init__(self, dependencies: EvidenceServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = EvidenceRepository(dependencies.session)
        self._settings = dependencies.settings

    async def upload_evidence(
        self,
        emergency_id: UUID,
        user_id: UUID,
        file: UploadFile,
        evidence_type: str,
        metadata: dict | None = None,
    ) -> Evidence:
        """Register and mock save uploaded evidence to local assets / Supabase."""

        # Simulating external file save URL path generator
        file_path = f"/assets/evidence/{emergency_id}/{file.filename}"
        
        evidence = await self._repository.log_evidence(
            emergency_id=emergency_id,
            user_id=user_id,
            evidence_type=evidence_type,
            file_url=file_path,
            file_hash="dummy_sha256_hash",
            is_encrypted=True,
            metadata=metadata,
        )
        await self._repository.commit()
        return evidence

    async def get_evidence(self, evidence_id: UUID) -> Evidence:
        """Get evidence logs."""

        evidence = await self._repository.get_evidence_by_id(evidence_id)
        if evidence is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        return evidence

    async def delete_evidence(self, evidence_id: UUID) -> None:
        """Delete evidence."""

        evidence = await self._repository.get_evidence_by_id(evidence_id)
        if evidence is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        await self._repository.delete_evidence(evidence)
        await self._repository.commit()
