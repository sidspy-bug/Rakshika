"""Gateway authentication and authorization guards."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, Request, status

from services.shared.security.authorization import Permission, Principal
from services.shared.security.jwt import JWTTokenService

from .config import GatewaySettings, RouteRegistry


@dataclass(slots=True)
class AuthenticatedRequest:
    """Security context extracted from the caller token."""

    principal: Principal | None
    token: str | None


class GatewaySecurityGuard:
    """Authenticate and classify inbound requests."""

    def __init__(self, settings: GatewaySettings, route_registry: RouteRegistry) -> None:
        self._settings = settings
        self._route_registry = route_registry
        self._jwt_service = JWTTokenService(settings.jwt)

    def is_public(self, path: str) -> bool:
        """Return whether a path can skip JWT authentication."""

        return self._route_registry.is_public(path) or path in {"/docs", "/redoc", "/openapi.json"}

    async def authenticate(self, request: Request) -> AuthenticatedRequest:
        """Authenticate the inbound request when required."""

        if self.is_public(request.url.path):
            return AuthenticatedRequest(principal=None, token=None)
        authorization = request.headers.get("Authorization")
        if not authorization:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
        try:
            claims = self._jwt_service.parse_claims(token)
            principal = Principal(
                user_id=UUID(claims.subject),
                email=None,
                roles=set(claims.roles),
                permissions=set(claims.permissions),
                session_id=UUID(claims.session_id) if claims.session_id else None,
                device_id=UUID(claims.device_id) if claims.device_id else None,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc
        request.state.principal = principal
        request.state.token = token
        return AuthenticatedRequest(principal=principal, token=token)
