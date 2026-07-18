"""Evidence data access layer."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.evidence import Evidence
from services.shared.utils.dates import now_utc


class EvidenceRepository:
    """Async repository for secure evidence uploads and logging."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def log_evidence(
        self,
        emergency_id: UUID,
        user_id: UUID,
        *,
        evidence_type: str,
        file_url: str,
        file_hash: str | None = None,
        is_encrypted: bool = True,
        metadata: dict | None = None,
    ) -> Evidence:
        """Create a secure evidence log entry."""

        evidence = Evidence(
            emergency_id=emergency_id,
            user_id=user_id,
            evidence_type=evidence_type,
            file_url=file_url,
            file_hash=file_hash,
            is_encrypted=is_encrypted,
            metadata_payload=metadata,
            uploaded_at=now_utc(),
        )
        self._session.add(evidence)
        await self._session.flush()
        return evidence

    async def get_evidence_by_id(self, evidence_id: UUID) -> Evidence | None:
        """Fetch a single evidence record."""

        query = select(Evidence).where(Evidence.id == evidence_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def delete_evidence(self, evidence: Evidence) -> None:
        """Permanently delete evidence log (hard delete)."""

        await self._session.delete(evidence)
        await self._session.flush()

    async def commit(self) -> None:
        """Commit active transaction."""
        await self._session.commit()
