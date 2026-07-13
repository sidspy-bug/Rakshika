"""User service business logic."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import UserServiceSettings
from ..models.user import EmergencyContact, UserPreference, UserProfile
from ..repositories.user_repository import UserRepository
from ..schemas.user import (
    ContactCreateRequest,
    ContactUpdateRequest,
    PreferenceUpdateRequest,
    ProfileUpdateRequest,
)


@dataclass(slots=True)
class UserServiceDependencies:
    """Aggregated dependencies for the user service."""

    session: AsyncSession
    settings: UserServiceSettings


class UserService:
    """Implement profile management, emergency contact, and preference workflows."""

    def __init__(self, dependencies: UserServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = UserRepository(dependencies.session)
        self._settings = dependencies.settings

    # ── Profile ──────────────────────────────────────────────────────────────

    async def get_or_create_profile(self, user_id: UUID) -> UserProfile:
        """Retrieve profile or create a default one if it does not exist."""

        profile = await self._repository.get_profile_by_user_id(user_id)
        if profile is None:
            profile = await self._repository.create_profile(user_id)
            # Create default preferences linked to the profile
            await self._repository.create_preferences(
                profile_id=profile.id,
                language=self._settings.user.default_language,
            )
            await self._repository.commit()
            # Fetch again to populate relationships correctly
            profile = await self._repository.get_profile_by_user_id(user_id)
        return profile

    async def update_profile(self, user_id: UUID, request: ProfileUpdateRequest) -> UserProfile:
        """Update user profile fields."""

        profile = await self.get_or_create_profile(user_id)
        update_data = request.model_dump(exclude_unset=True, by_alias=False)
        updated_profile = await self._repository.update_profile(profile, **update_data)
        await self._repository.commit()
        return updated_profile

    # ── Emergency Contacts ───────────────────────────────────────────────────

    async def list_contacts(self, user_id: UUID) -> list[EmergencyContact]:
        """List active emergency contacts."""

        profile = await self.get_or_create_profile(user_id)
        return await self._repository.list_contacts(profile.id)

    async def add_contact(self, user_id: UUID, request: ContactCreateRequest) -> EmergencyContact:
        """Add a new emergency contact, keeping it within limits."""

        profile = await self.get_or_create_profile(user_id)
        current_count = await self._repository.count_contacts(profile.id)
        if current_count >= self._settings.user.max_emergency_contacts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum emergency contacts limit ({self._settings.user.max_emergency_contacts}) reached",
            )
        contact = await self._repository.create_contact(
            profile_id=profile.id,
            name=request.name,
            phone=request.phone,
            relationship_type=request.relationship_type,
            email=str(request.email) if request.email else None,
            priority=request.priority,
            notify_on_sos=request.notify_on_sos,
        )
        await self._repository.commit()
        return contact

    async def update_contact(self, user_id: UUID, contact_id: UUID, request: ContactUpdateRequest) -> EmergencyContact:
        """Update an emergency contact."""

        profile = await self.get_or_create_profile(user_id)
        contact = await self._repository.get_contact_by_id(contact_id, profile.id)
        if contact is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found")
        update_data = request.model_dump(exclude_unset=True, by_alias=False)
        updated_contact = await self._repository.update_contact(contact, **update_data)
        await self._repository.commit()
        return updated_contact

    async def delete_contact(self, user_id: UUID, contact_id: UUID) -> None:
        """Soft-delete an emergency contact."""

        profile = await self.get_or_create_profile(user_id)
        contact = await self._repository.get_contact_by_id(contact_id, profile.id)
        if contact is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found")
        await self._repository.soft_delete_contact(contact)
        await self._repository.commit()

    # ── Preferences ──────────────────────────────────────────────────────────

    async def get_preferences(self, user_id: UUID) -> UserPreference:
        """Retrieve user preferences."""

        profile = await self.get_or_create_profile(user_id)
        prefs = await self._repository.get_preferences(profile.id)
        if prefs is None:
            prefs = await self._repository.create_preferences(
                profile_id=profile.id,
                language=self._settings.user.default_language,
            )
            await self._repository.commit()
        return prefs

    async def update_preferences(self, user_id: UUID, request: PreferenceUpdateRequest) -> UserPreference:
        """Update user preferences."""

        profile = await self.get_or_create_profile(user_id)
        prefs = await self.get_preferences(user_id)
        update_data = request.model_dump(exclude_unset=True, by_alias=False)
        updated_prefs = await self._repository.update_preferences(prefs, **update_data)
        await self._repository.commit()
        return updated_prefs
