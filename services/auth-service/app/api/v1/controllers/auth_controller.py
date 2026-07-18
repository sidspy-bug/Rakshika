"""Auth controller layer."""

from __future__ import annotations

from fastapi import Request, Response

from ..schemas.auth import AuthResponse, LoginRequest, LogoutRequest, MeResponse, RefreshRequest, RegisterRequest, TokenPairResponse
from ..services.auth_service import AuthService


class AuthController:
    """Translate HTTP requests into service calls and HTTP responses."""

    def __init__(self, service: AuthService) -> None:
        self._service = service

    async def register(self, request: Request, payload: RegisterRequest) -> AuthResponse:
        result = await self._service.register(payload, client_ip=self._client_ip(request), user_agent=request.headers.get("user-agent"))
        return self._build_auth_response(result)

    async def login(self, request: Request, payload: LoginRequest) -> AuthResponse:
        result = await self._service.login(payload, client_ip=self._client_ip(request), user_agent=request.headers.get("user-agent"))
        return self._build_auth_response(result)

    async def refresh(self, request: Request, payload: RefreshRequest) -> AuthResponse:
        result = await self._service.refresh(payload, refresh_token=self._cookie(request, "refresh_token"), client_ip=self._client_ip(request), user_agent=request.headers.get("user-agent"))
        return self._build_auth_response(result)

    async def logout(self, request: Request, payload: LogoutRequest, response: Response) -> None:
        await self._service.logout(
            payload,
            access_token=self._cookie(request, "access_token"),
            refresh_token=self._cookie(request, "refresh_token"),
            client_ip=self._client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
        response.delete_cookie(self._service.access_cookie_name)
        response.delete_cookie(self._service.refresh_cookie_name)

    async def me(self, request: Request) -> MeResponse:
        principal = await self._service.ensure_current_user(self._cookie(request, "access_token"))
        return await self._service.me(principal)

    def apply_auth_cookies(self, response: Response, payload: AuthResponse) -> None:
        response.set_cookie(
            self._service.access_cookie_name,
            payload.tokens.access_token,
            httponly=True,
            secure=self._service._settings.security.secure_cookies,
            samesite=self._service._settings.security.same_site,
        )
        response.set_cookie(
            self._service.refresh_cookie_name,
            payload.tokens.refresh_token,
            httponly=True,
            secure=self._service._settings.security.secure_cookies,
            samesite=self._service._settings.security.same_site,
        )

    def _build_auth_response(self, result) -> AuthResponse:
        return AuthResponse(
            user=self._service._to_user_read(result.user),
            tokens=TokenPairResponse(
                accessToken=result.tokens.access_token,
                refreshToken=result.tokens.refresh_token,
                accessExpiresAt=result.tokens.access_expires_at,
                refreshExpiresAt=result.tokens.refresh_expires_at,
                sessionId=result.session.id,
                deviceId=result.device_id,
            ),
            emailVerificationRequired=result.email_verification_required,
        )

    @staticmethod
    def _client_ip(request: Request) -> str | None:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()
        return request.client.host if request.client is not None else None

    @staticmethod
    def _cookie(request: Request, key: str) -> str | None:
        cookie_name = f"rakshika_{key}"
        return request.cookies.get(cookie_name)
