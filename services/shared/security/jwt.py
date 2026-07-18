"""JWT token creation and validation helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from uuid import UUID, uuid4

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from ..config.settings import JwtSettings
from ..utils.dates import add_days, add_minutes, now_utc


class TokenType(str, Enum):
    """Supported token types."""

    ACCESS = "access"
    REFRESH = "refresh"


@dataclass(slots=True)
class JWTClaims:
    """Normalized token claims."""

    subject: str
    token_type: TokenType
    issued_at: int
    expires_at: int
    issuer: str
    audience: str
    jwt_id: str
    session_id: str | None = None
    device_id: str | None = None
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class JWTTokenPair:
    """Access and refresh token pair."""

    access_token: str
    refresh_token: str
    access_expires_at: int
    refresh_expires_at: int
    access_jti: str
    refresh_jti: str


class JWTTokenService:
    """Create, decode, and validate JWTs."""

    def __init__(self, settings: JwtSettings) -> None:
        self._settings = settings

    def create_access_token(
        self,
        *,
        subject: str,
        roles: list[str] | None = None,
        permissions: list[str] | None = None,
        session_id: UUID | str | None = None,
        device_id: UUID | str | None = None,
        extra_claims: dict[str, str | int | bool] | None = None,
    ) -> str:
        """Create a signed access token."""

        return self._encode(
            subject=subject,
            token_type=TokenType.ACCESS,
            expires_at=add_minutes(now_utc(), self._settings.access_token_minutes),
            roles=roles or [],
            permissions=permissions or [],
            session_id=session_id,
            device_id=device_id,
            extra_claims=extra_claims,
        )

    def create_refresh_token(
        self,
        *,
        subject: str,
        session_id: UUID | str | None = None,
        device_id: UUID | str | None = None,
        extra_claims: dict[str, str | int | bool] | None = None,
    ) -> str:
        """Create a signed refresh token."""

        return self._encode(
            subject=subject,
            token_type=TokenType.REFRESH,
            expires_at=add_days(now_utc(), self._settings.refresh_token_days),
            roles=[],
            permissions=[],
            session_id=session_id,
            device_id=device_id,
            extra_claims=extra_claims,
        )

    def create_token_pair(
        self,
        *,
        subject: str,
        roles: list[str] | None = None,
        permissions: list[str] | None = None,
        session_id: UUID | str | None = None,
        device_id: UUID | str | None = None,
        extra_claims: dict[str, str | int | bool] | None = None,
    ) -> JWTTokenPair:
        """Create a matched access and refresh token pair."""

        access_token = self.create_access_token(
            subject=subject,
            roles=roles,
            permissions=permissions,
            session_id=session_id,
            device_id=device_id,
            extra_claims=extra_claims,
        )
        refresh_token = self.create_refresh_token(
            subject=subject,
            session_id=session_id,
            device_id=device_id,
            extra_claims=extra_claims,
        )
        decoded_access = self.decode_token(access_token)
        decoded_refresh = self.decode_token(refresh_token)
        return JWTTokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=decoded_access["exp"],
            refresh_expires_at=decoded_refresh["exp"],
            access_jti=str(decoded_access["jti"]),
            refresh_jti=str(decoded_refresh["jti"]),
        )

    def decode_token(self, token: str, *, verify_exp: bool = True) -> dict[str, object]:
        """Decode a token and validate its signature."""

        options = {"verify_exp": verify_exp}
        try:
            payload = jwt.decode(
                token,
                self._settings.secret_key,
                algorithms=[self._settings.algorithm],
                audience=self._settings.audience,
                issuer=self._settings.issuer,
                options=options,
                leeway=self._settings.clock_skew_seconds,
            )
        except ExpiredSignatureError as exc:
            raise InvalidTokenError("Token has expired") from exc
        return payload

    def parse_claims(self, token: str) -> JWTClaims:
        """Convert a raw token into strongly typed claims."""

        payload = self.decode_token(token)
        return JWTClaims(
            subject=str(payload["sub"]),
            token_type=TokenType(str(payload["typ"])),
            issued_at=int(payload["iat"]),
            expires_at=int(payload["exp"]),
            issuer=str(payload["iss"]),
            audience=str(payload["aud"]),
            jwt_id=str(payload["jti"]),
            session_id=str(payload.get("session_id")) if payload.get("session_id") is not None else None,
            device_id=str(payload.get("device_id")) if payload.get("device_id") is not None else None,
            roles=list(payload.get("roles", [])),
            permissions=list(payload.get("permissions", [])),
        )

    def _encode(
        self,
        *,
        subject: str,
        token_type: TokenType,
        expires_at,
        roles: list[str],
        permissions: list[str],
        session_id: UUID | str | None,
        device_id: UUID | str | None,
        extra_claims: dict[str, str | int | bool] | None,
    ) -> str:
        issued_at = now_utc()
        payload: dict[str, object] = {
            "sub": subject,
            "typ": token_type.value,
            "iat": int(issued_at.timestamp()),
            "exp": int(expires_at.timestamp()),
            "iss": self._settings.issuer,
            "aud": self._settings.audience,
            "jti": str(uuid4()),
            "roles": roles,
            "permissions": permissions,
        }
        if session_id is not None:
            payload["session_id"] = str(session_id)
        if device_id is not None:
            payload["device_id"] = str(device_id)
        if extra_claims:
            payload.update(extra_claims)
        return jwt.encode(payload, self._settings.secret_key, algorithm=self._settings.algorithm)
