"""User routes."""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, Request, status

from ....core.dependencies import get_user_service
from ..controllers.user_controller import UserController
from ..schemas.user import (
    ContactCreateRequest,
    ContactRead,
    ContactUpdateRequest,
    PreferenceRead,
    PreferenceUpdateRequest,
    ProfileRead,
    ProfileUpdateRequest,
)
from services.shared.dependencies import get_current_principal
from services.shared.security.authorization import Principal

router = APIRouter(tags=["Users"])


@router.get("/users/me", response_model=ProfileRead)
async def get_profile(
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> ProfileRead:
    controller = UserController(service)
    return await controller.get_profile(principal)


@router.put("/users/me", response_model=ProfileRead)
async def update_profile(
    payload: ProfileUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> ProfileRead:
    controller = UserController(service)
    return await controller.update_profile(principal, payload)


@router.get("/users/me/preferences", response_model=PreferenceRead)
async def get_preferences(
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> PreferenceRead:
    controller = UserController(service)
    return await controller.get_preferences(principal)


@router.put("/users/me/preferences", response_model=PreferenceRead)
async def update_preferences(
    payload: PreferenceUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> PreferenceRead:
    controller = UserController(service)
    return await controller.update_preferences(principal, payload)


@router.get("/users/me/contacts", response_model=list[ContactRead])
async def list_contacts(
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> list[ContactRead]:
    controller = UserController(service)
    return await controller.list_contacts(principal)


@router.post("/users/me/contacts", response_model=ContactRead, status_code=201)
async def add_contact(
    payload: ContactCreateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> ContactRead:
    controller = UserController(service)
    return await controller.add_contact(principal, payload)


@router.put("/users/me/contacts/{contactId}", response_model=ContactRead)
async def update_contact(
    contactId: UUID,
    payload: ContactUpdateRequest,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> ContactRead:
    controller = UserController(service)
    return await controller.update_contact(principal, contactId, payload)


@router.delete("/users/me/contacts/{contactId}", status_code=204)
async def delete_contact(
    contactId: UUID,
    principal: Principal = Depends(get_current_principal),
    service=Depends(get_user_service),
) -> None:
    controller = UserController(service)
    await controller.delete_contact(principal, contactId)
