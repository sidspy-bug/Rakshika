"""Auth service security helpers."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, Request, status

from services.shared.constants.app import HEADER_REQUEST_ID, HEADER_TRACE_ID, TOKEN_COOKIE_ACCESS, TOKEN_COOKIE_REFRESH
from services.shared.logging.context import RequestContext, set_request_context
from services.shared.security.authorization import Permission, Principal
from services.shared.security.jwt import JWTTokenService
from services.shared.security.passwords import hash_password, password_needs_rehash, verify_password

from .config import AuthServiceSettings


@dataclass(slots=True)
class AuthenticatedPrincipal:
    """Authenticated caller context."""

    principal: Principal
    token: str


class AuthSecurityService:
    """Encapsulate token and password operations."""

    def __init__(self, settings: AuthServiceSettings) -> None:
        self._settings = settings
        self._jwt = JWTTokenService(settings.jwt)

    def hash_password(self, password: str) -> str:
        return hash_password(password)

    def verify_password(self, password: str, hashed_password: str) -> bool:
        return verify_password(password, hashed_password)

    def password_needs_rehash(self, hashed_password: str) -> bool:
        return password_needs_rehash(hashed_password)

    def issue_token_pair(
        self,
        *,
        user_id: UUID,
        roles: list[str],
        permissions: list[str],
        session_id: UUID,
        device_id: UUID | None = None,
        extra_claims: dict[str, str | int | bool] | None = None,
    ):
        return self._jwt.create_token_pair(
            subject=str(user_id),
            roles=roles,
            permissions=permissions,
            session_id=session_id,
            device_id=device_id,
            extra_claims=extra_claims,
        )

    def decode_access_token(self, token: str) -> Principal:
        claims = self._jwt.parse_claims(token)
        return Principal(
            user_id=UUID(claims.subject),
            roles=set(claims.roles),
            permissions=set(claims.permissions),
            session_id=UUID(claims.session_id) if claims.session_id else None,
            device_id=UUID(claims.device_id) if claims.device_id else None,
        )

    def decode_refresh_token(self, token: str) -> Principal:
        claims = self._jwt.parse_claims(token)
        if claims.token_type.value != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        return Principal(
            user_id=UUID(claims.subject),
            roles=set(claims.roles),
            permissions=set(claims.permissions),
            session_id=UUID(claims.session_id) if claims.session_id else None,
            device_id=UUID(claims.device_id) if claims.device_id else None,
        )

    def set_request_context(self, request: Request, *, user_id: UUID | None = None, session_id: UUID | None = None) -> None:
        set_request_context(
            RequestContext(
                request_id=request.headers.get(HEADER_REQUEST_ID),
                trace_id=request.headers.get(HEADER_TRACE_ID),
                user_id=str(user_id) if user_id is not None else None,
                session_id=str(session_id) if session_id is not None else None,
                path=request.url.path,
                method=request.method,
            )
        )

    @property
    def access_cookie_name(self) -> str:
        return self._settings.security.access_token_cookie_name or TOKEN_COOKIE_ACCESS

    @property
    def refresh_cookie_name(self) -> str:
        return self._settings.security.refresh_token_cookie_name or TOKEN_COOKIE_REFRESH
