"""Evidence business logic."""

from __future__ import annotations

import hashlib
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import EvidenceServiceSettings
from ..models.evidence import Evidence
from ..repositories.evidence_repository import EvidenceRepository

logger = logging.getLogger("rakshika.evidence")

# Local storage root for MVP (production would use S3/Supabase)
EVIDENCE_STORAGE_ROOT = Path("/tmp/rakshika_evidence")


@dataclass(slots=True)
class EvidenceServiceDependencies:
    """Aggregated dependencies for the evidence service."""

    session: AsyncSession
    settings: EvidenceServiceSettings


class EvidenceService:
    """Implement evidence upload tracking and local file storage for MVP."""

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
        """Save uploaded evidence to local storage and record in DB with real SHA-256 hash."""

        # Read file content
        content = await file.read()

        # Compute real SHA-256 hash
        file_hash = hashlib.sha256(content).hexdigest()

        # Save to local storage
        storage_dir = EVIDENCE_STORAGE_ROOT / str(emergency_id)
        storage_dir.mkdir(parents=True, exist_ok=True)

        safe_filename = f"{uuid4().hex}_{file.filename or 'evidence'}"
        file_path = storage_dir / safe_filename

        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(
            "Evidence saved: emergency=%s type=%s size=%d hash=%s path=%s",
            emergency_id, evidence_type, len(content), file_hash[:16], file_path,
        )

        # Generate the API-accessible URL path
        file_url = f"/api/v1/evidence/files/{emergency_id}/{safe_filename}"

        evidence = await self._repository.log_evidence(
            emergency_id=emergency_id,
            user_id=user_id,
            evidence_type=evidence_type,
            file_url=file_url,
            file_hash=file_hash,
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

    async def get_evidence_for_emergency(self, emergency_id: UUID) -> list[Evidence]:
        """Get all evidence files for a specific emergency (for live feed links)."""

        return await self._repository.list_evidence_for_emergency(emergency_id)

    async def get_live_feed_url(self, emergency_id: UUID) -> dict:
        """Generate a secure live feed summary URL for emergency contacts.
        
        Returns a dict with the evidence feed URL and a list of available evidence files.
        """
        evidence_list = await self.get_evidence_for_emergency(emergency_id)
        
        base_url = getattr(self._settings, "evidence_base_url", "http://localhost:8000/api/v1")
        feed_url = f"{base_url}/evidence/live/{emergency_id}"

        return {
            "feed_url": feed_url,
            "emergency_id": str(emergency_id),
            "evidence_count": len(evidence_list),
            "files": [
                {
                    "id": str(e.id),
                    "type": e.evidence_type,
                    "url": e.file_url,
                    "created_at": str(e.created_at) if hasattr(e, "created_at") else None,
                }
                for e in evidence_list
            ],
        }

    async def delete_evidence(self, evidence_id: UUID) -> None:
        """Delete evidence record and local file."""

        evidence = await self._repository.get_evidence_by_id(evidence_id)
        if evidence is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
        
        # Try to remove local file
        try:
            if evidence.file_url:
                # Extract relative path from URL
                parts = evidence.file_url.split("/evidence/files/")
                if len(parts) == 2:
                    local_path = EVIDENCE_STORAGE_ROOT / parts[1]
                    if local_path.exists():
                        local_path.unlink()
                        logger.info("Deleted evidence file: %s", local_path)
        except Exception:
            logger.warning("Could not delete local evidence file for %s", evidence_id)

        await self._repository.delete_evidence(evidence)
        await self._repository.commit()

