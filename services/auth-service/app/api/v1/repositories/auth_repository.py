"""Authentication repository layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import Select, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.auth import AuditLog, Device, RefreshToken, Role, Session, User, user_roles


@dataclass(slots=True)
class AuthRepository:
    """Async persistence operations for the auth domain."""

    session: AsyncSession

    async def create_role(self, name: str, description: str | None = None, *, is_system: bool = False) -> Role:
        role = Role(name=name, description=description, is_system=is_system)
        self.session.add(role)
        await self.session.flush()
        return role

    async def get_role_by_name(self, name: str) -> Role | None:
        result = await self.session.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def ensure_role(self, name: str, description: str | None = None, *, is_system: bool = False) -> Role:
        role = await self.get_role_by_name(name)
        if role is not None:
            return role
        return await self.create_role(name=name, description=description, is_system=is_system)

    async def create_user(self, *, full_name: str, email: str, phone: str, password_hash: str, status: str = "active") -> User:
        user = User(full_name=full_name, email=email, phone=phone, password_hash=password_hash, status=status)
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User)
            .where(User.email == email)
            .options(selectinload(User.roles), selectinload(User.sessions), selectinload(User.devices))
        )
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> User | None:
        result = await self.session.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.roles), selectinload(User.sessions), selectinload(User.devices))
        )
        return result.scalar_one_or_none()

    async def get_user_by_phone(self, phone: str) -> User | None:
        result = await self.session.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def assign_roles(self, user: User, roles: Sequence[Role]) -> None:
        user.roles = list(roles)
        await self.session.flush()

    async def create_or_update_device(
        self,
        *,
        user_id: UUID,
        fingerprint: str,
        name: str | None = None,
        platform: str | None = None,
        model: str | None = None,
        os_version: str | None = None,
        app_version: str | None = None,
        push_token: str | None = None,
        last_seen_at: datetime | None = None,
    ) -> Device:
        result = await self.session.execute(
            select(Device).where(Device.user_id == user_id, Device.device_fingerprint == fingerprint)
        )
        device = result.scalar_one_or_none()
        if device is None:
            device = Device(
                user_id=user_id,
                device_fingerprint=fingerprint,
                name=name,
                platform=platform,
                model=model,
                os_version=os_version,
                app_version=app_version,
                push_token=push_token,
                last_seen_at=last_seen_at,
            )
            self.session.add(device)
        else:
            device.name = name or device.name
            device.platform = platform or device.platform
            device.model = model or device.model
            device.os_version = os_version or device.os_version
            device.app_version = app_version or device.app_version
            device.push_token = push_token or device.push_token
            device.last_seen_at = last_seen_at or device.last_seen_at
        await self.session.flush()
        return device

    async def create_session(
        self,
        *,
        user_id: UUID,
        device_id: UUID | None,
        session_jti: str,
        expires_at: datetime,
        ip_address: str | None,
        user_agent: str | None,
    ) -> Session:
        session = Session(
            user_id=user_id,
            device_id=device_id,
            session_jti=session_jti,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(session)
        await self.session.flush()
        return session

    async def get_session_by_id(self, session_id: UUID) -> Session | None:
        result = await self.session.execute(
            select(Session)
            .where(Session.id == session_id)
            .options(selectinload(Session.refresh_tokens), selectinload(Session.user), selectinload(Session.device))
        )
        return result.scalar_one_or_none()

    async def get_session_by_jti(self, session_jti: str) -> Session | None:
        result = await self.session.execute(select(Session).where(Session.session_jti == session_jti))
        return result.scalar_one_or_none()

    async def revoke_session(self, session: Session, *, reason: str) -> Session:
        session.revoked_at = datetime.utcnow()
        session.revocation_reason = reason
        await self.session.flush()
        return session

    async def create_refresh_token(
        self,
        *,
        user_id: UUID,
        session_id: UUID,
        device_id: UUID | None,
        jti: str,
        token_hash: str,
        expires_at: datetime,
        token_family: str | None = None,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            session_id=session_id,
            device_id=device_id,
            jti=jti,
            token_hash=token_hash,
            expires_at=expires_at,
            token_family=token_family,
        )
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_refresh_token_by_jti(self, jti: str) -> RefreshToken | None:
        result = await self.session.execute(select(RefreshToken).where(RefreshToken.jti == jti))
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: RefreshToken, *, replaced_by_jti: str | None = None) -> RefreshToken:
        token.revoked_at = datetime.utcnow()
        token.replaced_by_jti = replaced_by_jti
        token.rotated_at = datetime.utcnow()
        await self.session.flush()
        return token

    async def create_audit_log(
        self,
        *,
        user_id: UUID | None,
        session_id: UUID | None,
        action: str,
        resource_type: str | None,
        resource_id: str | None,
        status: str,
        ip_address: str | None,
        user_agent: str | None,
        metadata: dict[str, object] | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            user_id=user_id,
            session_id=session_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
        )
        self.session.add(audit_log)
        await self.session.flush()
        return audit_log
