"""Auth service business logic."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from services.shared.logging.context import RequestContext, set_request_context
from services.shared.security.authorization import Permission, Principal
from services.shared.security.jwt import JWTTokenPair, JWTTokenService
from services.shared.utils.dates import add_days, now_utc

from ....core.config import AuthServiceSettings
from ....core.security import AuthSecurityService
from ..models.auth import RefreshToken, Role, Session, User
from ..repositories.auth_repository import AuthRepository
from ..schemas.auth import (
    AuthResponse,
    DeviceContext,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    RoleRead,
    SessionRead,
    TokenPairResponse,
    UserRead,
)


@dataclass(slots=True)
class AuthServiceDependencies:
    """Aggregated dependencies for the auth service."""

    session: AsyncSession
    settings: AuthServiceSettings
    redis_client: Redis | None


@dataclass(slots=True)
class AuthResult:
    """Unified authentication response payload."""

    user: User
    session: Session
    tokens: JWTTokenPair
    email_verification_required: bool
    device_id: UUID | None = None


class AuthService:
    """Implement register/login/refresh/logout/me workflows."""

    def __init__(self, dependencies: AuthServiceDependencies) -> None:
        self._dependencies = dependencies
        self._repository = AuthRepository(dependencies.session)
        self._settings = dependencies.settings
        self._security = AuthSecurityService(dependencies.settings)
        self._token_service = JWTTokenService(dependencies.settings.jwt)

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
            print(f"Failed to retrieve Google securetoken public keys in auth: {e}")
        return {}

    async def _verify_firebase_token(self, token: str) -> dict[str, object]:
        """Decode and verify Firebase ID tokens using RS256 signature."""
        import jwt
        
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise ValueError("Missing kid in Firebase token header")

        certs = await self._get_firebase_public_keys()
        cert_pem = certs.get(kid)
        if not cert_pem:
            raise ValueError(f"No Google public key matching kid: {kid}")

        project_id = self._settings.auth.firebase_project_id if hasattr(self._settings.auth, "firebase_project_id") else "rakshika-safety"
        decoded = jwt.decode(
            token,
            cert_pem,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}"
        )
        return decoded


    async def register(self, request: RegisterRequest, *, client_ip: str | None, user_agent: str | None) -> AuthResult:
        import uuid

        user_uuid = None
        if request.firebase_token:
            # 1. Firebase signup path
            try:
                decoded = await self._verify_firebase_token(request.firebase_token)
                firebase_uid = decoded["sub"]
                user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"firebase:{firebase_uid}")
            except Exception as exc:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Firebase token verification failed: {exc}")

            # 2. Check if user already exists
            user = await self._repository.get_user_by_id(user_uuid)
            if user is not None:
                # User already exists - perform silent login
                device = await self._build_device(user.id, request.device)
                session = await self._create_session(user=user, device=device, client_ip=client_ip, user_agent=user_agent)
                tokens = await self._issue_tokens(user=user, session=session, device=device)
                await self._write_audit_log(user.id, session.id, action="auth.login", status="success", client_ip=client_ip, user_agent=user_agent)
                return AuthResult(
                    user=user,
                    session=session,
                    tokens=tokens,
                    email_verification_required=False,
                    device_id=device.id if device is not None else None,
                )
        else:
            # 3. Standard local signup path
            self._validate_password(request.password)
            await self._ensure_unique_identity(request.email, request.phone)

        # 4. Save User details to Postgres
        default_role = await self._repository.ensure_role(
            self._settings.auth.default_role_name,
            description="Default authenticated user role",
            is_system=True,
        )

        # Set secure mock password if signing up via Firebase
        password_raw = request.password or uuid.uuid4().hex
        hashed_password = self._security.hash_password(password_raw)

        user = await self._repository.create_user(
            user_id=user_uuid,
            full_name=request.full_name,
            email=str(request.email).lower(),
            phone=request.phone,
            password_hash=hashed_password,
        )
        await self._repository.assign_roles(user, [default_role])
        user = await self._repository.get_user_by_id(user.id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User creation failed")
        device = await self._build_device(user.id, request.device)
        session = await self._create_session(user=user, device=device, client_ip=client_ip, user_agent=user_agent)
        tokens = await self._issue_tokens(user=user, session=session, device=device)
        await self._write_audit_log(user.id, session.id, action="auth.register", status="success", client_ip=client_ip, user_agent=user_agent)
        return AuthResult(
            user=user,
            session=session,
            tokens=tokens,
            email_verification_required=False if request.firebase_token else self._settings.auth.require_email_verification,
            device_id=device.id if device is not None else None,
        )

    async def login(self, request: LoginRequest, *, client_ip: str | None, user_agent: str | None) -> AuthResult:
        user = await self._repository.get_user_by_email(str(request.email).lower())
        if user is None or not self._security.verify_password(request.password, user.password_hash):
            await self._repository.create_audit_log(
                user_id=user.id if user is not None else None,
                session_id=None,
                action="auth.login",
                resource_type="user",
                resource_id=str(user.id) if user is not None else None,
                status="failed",
                ip_address=client_ip,
                user_agent=user_agent,
                metadata={"reason": "invalid_credentials"},
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if user.deleted_at is not None or user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
        device = await self._build_device(user.id, request.device)
        session = await self._create_session(user=user, device=device, client_ip=client_ip, user_agent=user_agent)
        tokens = await self._issue_tokens(user=user, session=session, device=device)
        user.last_login_at = now_utc()
        user.failed_login_attempts = 0
        user.locked_until = None
        await self._write_audit_log(user.id, session.id, action="auth.login", status="success", client_ip=client_ip, user_agent=user_agent)
        return AuthResult(
            user=user,
            session=session,
            tokens=tokens,
            email_verification_required=not user.is_email_verified and self._settings.auth.require_email_verification,
            device_id=device.id if device is not None else None,
        )

    async def refresh(self, request: RefreshRequest, *, refresh_token: str | None, client_ip: str | None, user_agent: str | None) -> AuthResult:
        token_value = request.refresh_token or refresh_token
        if token_value is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
        claims = self._token_service.parse_claims(token_value)
        if claims.token_type.value != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        stored_token = await self._repository.get_refresh_token_by_jti(claims.jwt_id)
        if stored_token is None or stored_token.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")
        session = await self._repository.get_session_by_id(stored_token.session_id)
        if session is None or session.revoked_at is not None or session.expires_at < now_utc():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
        user = await self._repository.get_user_by_id(stored_token.user_id)
        if user is None or user.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        await self._repository.revoke_refresh_token(stored_token, replaced_by_jti=str(uuid4()))
        tokens = await self._issue_tokens(user=user, session=session, device=session.device)
        await self._repository.create_audit_log(
            user_id=user.id,
            session_id=session.id,
            action="auth.refresh",
            resource_type="session",
            resource_id=str(session.id),
            status="success",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        return AuthResult(
            user=user,
            session=session,
            tokens=tokens,
            email_verification_required=not user.is_email_verified and self._settings.auth.require_email_verification,
            device_id=session.device_id,
        )

    async def logout(self, request: LogoutRequest, *, access_token: str | None, refresh_token: str | None, client_ip: str | None, user_agent: str | None) -> None:
        candidate_refresh = request.refresh_token or refresh_token
        principal = None
        if access_token is not None:
            principal = self._security.decode_access_token(access_token)
            await self._blacklist_access_token(access_token)
        session = None
        if request.session_id is not None:
            session = await self._repository.get_session_by_id(request.session_id)
        elif principal is not None and principal.session_id is not None:
            session = await self._repository.get_session_by_id(principal.session_id)
        if session is None and candidate_refresh is not None:
            refresh_claims = self._token_service.parse_claims(candidate_refresh)
            session = await self._repository.get_session_by_id(UUID(refresh_claims.session_id)) if refresh_claims.session_id else None
        if session is not None and session.revoked_at is None:
            await self._repository.revoke_session(session, reason="logout")
        if candidate_refresh is not None:
            refresh_claims = self._token_service.parse_claims(candidate_refresh)
            stored = await self._repository.get_refresh_token_by_jti(refresh_claims.jwt_id)
            if stored is not None and stored.revoked_at is None:
                await self._repository.revoke_refresh_token(stored)
        await self._repository.create_audit_log(
            user_id=session.user_id if session is not None else None,
            session_id=session.id if session is not None else None,
            action="auth.logout",
            resource_type="session",
            resource_id=str(session.id) if session is not None else None,
            status="success",
            ip_address=client_ip,
            user_agent=user_agent,
        )

    async def me(self, principal: Principal) -> MeResponse:
        user = await self._repository.get_user_by_id(principal.user_id)
        if user is None or user.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        session = None
        if principal.session_id is not None:
            session = await self._repository.get_session_by_id(principal.session_id)
        return MeResponse(user=self._to_user_read(user), session=self._to_session_read(session) if session is not None else None)

    async def ensure_current_user(self, access_token: str) -> Principal:
        principal = self._security.decode_access_token(access_token)
        return principal

    async def issue_email_verification_token(self, user: User) -> str:
        return self._token_service.create_access_token(subject=str(user.id), roles=[role.name for role in user.roles], permissions=[], extra_claims={"purpose": "email_verification"})

    async def generate_otp(self, user: User) -> str:
        return str(uuid4().int)[0 : self._settings.auth.otp_length].zfill(self._settings.auth.otp_length)

    async def verify_otp(self, user: User, otp: str) -> bool:
        return len(otp) == self._settings.auth.otp_length and otp.isdigit()

    def _validate_password(self, password: str) -> None:
        if len(password) < self._settings.auth.password_min_length:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password does not meet minimum length")

    async def _ensure_unique_identity(self, email: str, phone: str) -> None:
        existing_email = await self._repository.get_user_by_email(email.lower())
        if existing_email is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        existing_phone = await self._repository.get_user_by_phone(phone)
        if existing_phone is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered")

    async def _build_device(self, user_id: UUID, device: DeviceContext | None):
        if device is None:
            return None
        return await self._repository.create_or_update_device(
            user_id=user_id,
            fingerprint=device.fingerprint,
            name=device.name,
            platform=device.platform,
            model=device.model,
            os_version=device.os_version,
            app_version=device.app_version,
            push_token=device.push_token,
            last_seen_at=now_utc(),
        )

    async def _create_session(self, *, user: User, device, client_ip: str | None, user_agent: str | None) -> Session:
        expires_at = add_days(now_utc(), self._settings.auth.session_ttl_days)
        return await self._repository.create_session(
            user_id=user.id,
            device_id=device.id if device is not None else None,
            session_jti=str(uuid4()),
            expires_at=expires_at,
            ip_address=client_ip,
            user_agent=user_agent,
        )

    async def _issue_tokens(self, *, user: User, session: Session, device) -> JWTTokenPair:
        roles = [role.name for role in user.roles]
        permissions = [Permission.USER_READ.value]
        tokens = self._security.issue_token_pair(
            user_id=user.id,
            roles=roles,
            permissions=permissions,
            session_id=session.id,
            device_id=device.id if device is not None else None,
        )
        await self._repository.create_refresh_token(
            user_id=user.id,
            session_id=session.id,
            device_id=device.id if device is not None else None,
            jti=self._security.decode_refresh_token(tokens.refresh_token).session_id or str(session.id),
            token_hash=self._security.hash_password(tokens.refresh_token),
            expires_at=datetime.fromtimestamp(tokens.refresh_expires_at, tz=timezone.utc),
            token_family=str(session.id),
        )
        return tokens

    async def _blacklist_access_token(self, access_token: str) -> None:
        if self._dependencies.redis_client is None:
            return
        claims = self._security.decode_access_token(access_token)
        ttl_seconds = max(int(datetime.fromtimestamp(self._token_service.decode_token(access_token)["exp"]).timestamp() - now_utc().timestamp()), 1)
        await self._dependencies.redis_client.setex(f"auth:blacklist:access:{claims.session_id}:{claims.user_id}", ttl_seconds, "1")

    async def _write_audit_log(self, user_id: UUID | None, session_id: UUID | None, *, action: str, status: str, client_ip: str | None, user_agent: str | None) -> None:
        await self._repository.create_audit_log(
            user_id=user_id,
            session_id=session_id,
            action=action,
            resource_type="auth",
            resource_id=str(user_id) if user_id is not None else None,
            status=status,
            ip_address=client_ip,
            user_agent=user_agent,
        )

    def _to_user_read(self, user: User) -> UserRead:
        return UserRead(
            id=user.id,
            created_at=user.created_at,
            updated_at=user.updated_at,
            fullName=user.full_name,
            email=user.email,
            phone=user.phone,
            status=user.status,
            isEmailVerified=user.is_email_verified,
            isPhoneVerified=user.is_phone_verified,
            lastLoginAt=user.last_login_at,
            roles=[RoleRead(id=role.id, created_at=role.created_at, updated_at=role.updated_at, name=role.name, description=role.description) for role in user.roles],
        )

    def _to_session_read(self, session: Session) -> SessionRead:
        return SessionRead(
            id=session.id,
            sessionJti=session.session_jti,
            deviceId=session.device_id,
            expiresAt=session.expires_at,
            revokedAt=session.revoked_at,
            lastSeenAt=session.last_seen_at,
        )
