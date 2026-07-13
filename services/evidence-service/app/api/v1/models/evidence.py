"""Evidence domain ORM models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func, JSON
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from services.shared.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Evidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Secure encrypted media evidence records linked to active SOS events."""

    __tablename__ = "evidence"
    __table_args__ = (
        Index("ix_evidence_emergency_id", "emergency_id"),
        Index("ix_evidence_user_id", "user_id"),
    )

    emergency_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(32), nullable=False) # audio, video, photo
    file_url: Mapped[str] = mapped_column(String(512), nullable=False)
    file_hash: Mapped[str | None] = mapped_column(String(255), nullable=True) # SHA-256 integrity verification
    is_encrypted: Mapped[bool] = mapped_column(nullable=False, default=True)
    
    # Contextual metadata (e.g. initial GPS coordinates, device metrics)
    metadata_payload: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
