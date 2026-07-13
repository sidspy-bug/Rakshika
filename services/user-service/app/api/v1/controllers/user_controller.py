"""User controller layer."""

from __future__ import annotations

from uuid import UUID
from fastapi import Request

from ..schemas.user import (
    ContactCreateRequest,
    ContactRead,
    ContactUpdateRequest,
    PreferenceRead,
    PreferenceUpdateRequest,
    ProfileRead,
    ProfileUpdateRequest,
)
from ..services.user_service import UserService
from services.shared.security.authorization import Principal


class UserController:
    """Translate HTTP requests into user service calls."""

    def __init__(self, service: UserService) -> None:
        self._service = service

    # ── Profile ──────────────────────────────────────────────────────────────

    async def get_profile(self, principal: Principal) -> ProfileRead:
        profile = await self._service.get_or_create_profile(principal.user_id)
        return ProfileRead.model_validate(profile)

    async def update_profile(self, principal: Principal, payload: ProfileUpdateRequest) -> ProfileRead:
        profile = await self._service.update_profile(principal.user_id, payload)
        return ProfileRead.model_validate(profile)

    # ── Preferences ──────────────────────────────────────────────────────────

    async def get_preferences(self, principal: Principal) -> PreferenceRead:
        preferences = await self._service.get_preferences(principal.user_id)
        return PreferenceRead.model_validate(preferences)

    async def update_preferences(self, principal: Principal, payload: PreferenceUpdateRequest) -> PreferenceRead:
        preferences = await self._service.update_preferences(principal.user_id, payload)
        return PreferenceRead.model_validate(preferences)

    # ── Emergency Contacts ───────────────────────────────────────────────────

    async def list_contacts(self, principal: Principal) -> list[ContactRead]:
        contacts = await self._service.list_contacts(principal.user_id)
        return [ContactRead.model_validate(c) for c in contacts]

    async def add_contact(self, principal: Principal, payload: ContactCreateRequest) -> ContactRead:
        contact = await self._service.add_contact(principal.user_id, payload)
        return ContactRead.model_validate(contact)

    async def update_contact(self, principal: Principal, contact_id: UUID, payload: ContactUpdateRequest) -> ContactRead:
        contact = await self._service.update_contact(principal.user_id, contact_id, payload)
        return ContactRead.model_validate(contact)

    async def delete_contact(self, principal: Principal, contact_id: UUID) -> None:
        await self._service.delete_contact(principal.user_id, contact_id)
