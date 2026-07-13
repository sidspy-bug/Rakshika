"""User data access layer."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.user import EmergencyContact, UserPreference, UserProfile
from services.shared.utils.dates import now_utc


class UserRepository:
    """Async repository for user-related database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Profile ──────────────────────────────────────────────────────────────

    async def get_profile_by_user_id(self, user_id: UUID) -> UserProfile | None:
        """Return the profile for a user, eagerly loading contacts and preferences."""

        query = (
            select(UserProfile)
            .where(UserProfile.user_id == user_id)
            .options(
                selectinload(UserProfile.emergency_contacts),
                selectinload(UserProfile.preferences),
            )
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def create_profile(self, user_id: UUID) -> UserProfile:
        """Create a default profile for a newly registered user."""

        profile = UserProfile(user_id=user_id)
        self._session.add(profile)
        await self._session.flush()
        return profile

    async def update_profile(self, profile: UserProfile, **fields: object) -> UserProfile:
        """Apply partial updates to a profile."""

        for key, value in fields.items():
            if value is not None and hasattr(profile, key):
                setattr(profile, key, value)
        profile.updated_at = now_utc()
        await self._session.flush()
        return profile

    # ── Emergency Contacts ───────────────────────────────────────────────────

    async def list_contacts(self, profile_id: UUID) -> list[EmergencyContact]:
        """Return all non-deleted emergency contacts for a profile."""

        query = (
            select(EmergencyContact)
            .where(
                EmergencyContact.profile_id == profile_id,
                EmergencyContact.deleted_at.is_(None),
            )
            .order_by(EmergencyContact.priority)
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def get_contact_by_id(self, contact_id: UUID, profile_id: UUID) -> EmergencyContact | None:
        """Return a single emergency contact."""

        query = select(EmergencyContact).where(
            EmergencyContact.id == contact_id,
            EmergencyContact.profile_id == profile_id,
            EmergencyContact.deleted_at.is_(None),
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def count_contacts(self, profile_id: UUID) -> int:
        """Return the number of active contacts for a profile."""

        contacts = await self.list_contacts(profile_id)
        return len(contacts)

    async def create_contact(
        self,
        profile_id: UUID,
        *,
        name: str,
        phone: str,
        relationship_type: str | None = None,
        email: str | None = None,
        priority: int = 0,
        notify_on_sos: bool = True,
    ) -> EmergencyContact:
        """Create a new emergency contact."""

        contact = EmergencyContact(
            profile_id=profile_id,
            name=name,
            phone=phone,
            relationship_type=relationship_type,
            email=email,
            priority=priority,
            notify_on_sos=notify_on_sos,
        )
        self._session.add(contact)
        await self._session.flush()
        return contact

    async def update_contact(self, contact: EmergencyContact, **fields: object) -> EmergencyContact:
        """Apply partial updates to a contact."""

        for key, value in fields.items():
            if value is not None and hasattr(contact, key):
                setattr(contact, key, value)
        contact.updated_at = now_utc()
        await self._session.flush()
        return contact

    async def soft_delete_contact(self, contact: EmergencyContact) -> None:
        """Soft-delete an emergency contact."""

        contact.deleted_at = now_utc()
        await self._session.flush()

    # ── Preferences ──────────────────────────────────────────────────────────

    async def get_preferences(self, profile_id: UUID) -> UserPreference | None:
        """Return the preferences for a profile."""

        query = select(UserPreference).where(UserPreference.profile_id == profile_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def create_preferences(self, profile_id: UUID, **defaults: object) -> UserPreference:
        """Create default preferences for a profile."""

        preference = UserPreference(profile_id=profile_id, **defaults)
        self._session.add(preference)
        await self._session.flush()
        return preference

    async def update_preferences(self, preference: UserPreference, **fields: object) -> UserPreference:
        """Apply partial updates to preferences."""

        for key, value in fields.items():
            if value is not None and hasattr(preference, key):
                setattr(preference, key, value)
        preference.updated_at = now_utc()
        await self._session.flush()
        return preference

    async def commit(self) -> None:
        """Commit the current transaction."""
        await self._session.commit()
