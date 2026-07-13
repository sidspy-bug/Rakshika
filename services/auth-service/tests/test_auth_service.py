from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from services.auth-service.app.api.v1.schemas.auth import DeviceContext, LoginRequest, RegisterRequest
from services.auth-service.app.api.v1.services.auth_service import AuthResult, AuthService, AuthServiceDependencies
from services.auth-service.app.core.config import AuthServiceSettings


class DummySession:
    pass


@dataclass(slots=True)
class InMemoryUser:
    id: UUID
    full_name: str
    email: str
    phone: str
    password_hash: str
    status: str = "active"
    is_email_verified: bool = False
    is_phone_verified: bool = False
    last_login_at: datetime | None = None
    deleted_at: datetime | None = None
    roles: list[object] = field(default_factory=list)


class FakeRepository:
    def __init__(self) -> None:
        self.users: dict[str, InMemoryUser] = {}
