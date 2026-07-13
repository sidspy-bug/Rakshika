"""Evidence routes."""

from __future__ import annotations

from uuid import UUID
import json
from fastapi import APIRouter, Depends, File, Form, UploadFile

from ....core.dependencies import get_evidence_service
from ..controllers.evidence_controller import EvidenceController
from ..schemas.evidence import EvidenceRead
from services.shared.dependencies import get_current_principal
from services.shared.security.authorization import Principal

router = APIRouter(tags=["Evidence"])


@router.post("/evidence/upload", response_model=EvidenceRead, status_code=201)
async def upload_evidence(
    emergencyId: UUID = Form(...),
    type: str = Form(...),
    metadata: str | None = Form(default=None),
    file: UploadFile = File(...),
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_evidence_service),
) -> EvidenceRead:
    parsed_metadata = json.loads(metadata) if metadata else None
    controller = EvidenceController(service)
    return await controller.upload_evidence(principal, emergencyId, file, type, parsed_metadata)


@router.post("/evidence/video", response_model=EvidenceRead, status_code=201)
async def register_video(
    emergencyId: UUID = Form(...),
    metadata: str | None = Form(default=None),
    file: UploadFile = File(...),
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_evidence_service),
) -> EvidenceRead:
    parsed_metadata = json.loads(metadata) if metadata else None
    controller = EvidenceController(service)
    return await controller.upload_evidence(principal, emergencyId, file, "video", parsed_metadata)


@router.post("/evidence/audio", response_model=EvidenceRead, status_code=201)
async def register_audio(
    emergencyId: UUID = Form(...),
    metadata: str | None = Form(default=None),
    file: UploadFile = File(...),
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_evidence_service),
) -> EvidenceRead:
    parsed_metadata = json.loads(metadata) if metadata else None
    controller = EvidenceController(service)
    return await controller.upload_evidence(principal, emergencyId, file, "audio", parsed_metadata)


@router.get("/evidence/{evidenceId}", response_model=EvidenceRead)
async def get_evidence(
    evidenceId: UUID,
    service=Depends(get_evidence_service),
) -> EvidenceRead:
    controller = EvidenceController(service)
    return await controller.get_evidence(evidenceId)


@router.delete("/evidence/{evidenceId}", status_code=204)
async def delete_evidence(
    evidenceId: UUID,
    service=Depends(get_evidence_service),
) -> None:
    controller = EvidenceController(service)
    await controller.delete_evidence(evidenceId)
