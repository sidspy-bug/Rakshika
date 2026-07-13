"""Role-based authorization helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable
from uuid import UUID

from ..exceptions.base import AuthorizationError


class Permission(str, Enum):
    """Canonical permission names used across services."""

    ADMIN = "admin"
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    AUTH_SESSION_MANAGE = "auth:session:manage"


@dataclass(slots=True)
class Principal:
    """Authenticated caller identity."""

    user_id: UUID
    email: str | None = None
    roles: set[str] = field(default_factory=set)
    permissions: set[str] = field(default_factory=set)
    session_id: UUID | None = None
    device_id: UUID | None = None


def has_roles(principal: Principal, required_roles: Iterable[str]) -> bool:
    """Return whether a principal has at least one required role."""

    required = {role for role in required_roles}
    if not required:
        return True
    return bool(principal.roles.intersection(required))


def has_permissions(principal: Principal, required_permissions: Iterable[str]) -> bool:
    """Return whether a principal has every required permission."""

    required = {permission for permission in required_permissions}
    if not required:
        return True
    return required.issubset(principal.permissions)


def require_authorization(
    principal: Principal,
    *,
    roles: Iterable[str] = (),
    permissions: Iterable[str] = (),
) -> None:
    """Raise an authorization error if the principal is not allowed."""

    if roles and not has_roles(principal, roles):
        raise AuthorizationError("The current user is missing the required role")
    if permissions and not has_permissions(principal, permissions):
        raise AuthorizationError("The current user is missing the required permission")
