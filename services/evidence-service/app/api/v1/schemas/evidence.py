"""Evidence request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from services.shared.schemas.base import BaseSchema, TimestampSchema, UUIDSchema


class EvidenceRead(UUIDSchema, TimestampSchema):
    """Evidence log details."""

    emergency_id: UUID = Field(alias="emergencyId")
    user_id: UUID = Field(alias="userId")
    evidence_type: str = Field(alias="evidenceType")
    file_url: str = Field(alias="fileUrl")
    file_hash: str | None = Field(default=None, alias="fileHash")
    is_encrypted: bool = Field(alias="isEncrypted")
    metadata_payload: dict | None = Field(default=None, alias="metadata")
    uploaded_at: datetime = Field(alias="uploadedAt")
