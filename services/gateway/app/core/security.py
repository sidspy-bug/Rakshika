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

    async def _get_firebase_public_keys(self) -> dict[str, str]:
        """Fetch Google's public certificates for Firebase ID Token validation."""
        import httpx
        
        url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"Failed to retrieve Google securetoken public keys: {e}")
        return {}

    async def _verify_firebase_token(self, token: str) -> Principal:
        """Decode and verify Firebase ID tokens using RS256 signature."""
        import jwt
        import uuid
        
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise ValueError("Missing kid in Firebase token header")

        certs = await self._get_firebase_public_keys()
        cert_pem = certs.get(kid)
        if not cert_pem:
            raise ValueError(f"No Google public key matching kid: {kid}")

        project_id = self._settings.firebase_project_id or "rakshika-safety"
        decoded = jwt.decode(
            token,
            cert_pem,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}"
        )

        # Generate a deterministic user UUID from the Firebase String UID
        firebase_uid = decoded["sub"]
        user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"firebase:{firebase_uid}")

        roles = set(decoded.get("roles", ["user"]))
        permissions = set(decoded.get("permissions", []))

        return Principal(
            user_id=user_uuid,
            email=decoded.get("email"),
            roles=roles,
            permissions=permissions,
            session_id=None,
            device_id=None,
        )

    async def authenticate(self, request: Request) -> AuthenticatedRequest:
        """Authenticate the inbound request when required using dual-mode verification."""
        import jwt

        if self.is_public(request.url.path):
            return AuthenticatedRequest(principal=None, token=None)
        authorization = request.headers.get("Authorization")
        if not authorization:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
        
        try:
            # Detect if token is a Firebase token by checking the header signature configuration
            try:
                unverified_header = jwt.get_unverified_header(token)
                is_firebase = "kid" in unverified_header
            except Exception:
                is_firebase = False

            if is_firebase:
                principal = await self._verify_firebase_token(token)
            else:
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
