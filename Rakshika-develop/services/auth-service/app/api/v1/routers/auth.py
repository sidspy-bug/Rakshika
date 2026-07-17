"""Auth endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from ..controllers.auth_controller import AuthController
from ..schemas.auth import AuthResponse, LoginRequest, LogoutRequest, MeResponse, RefreshRequest, RegisterRequest
from ....core.dependencies import get_auth_service

router = APIRouter(tags=["Auth"])


def _controller(request: Request) -> AuthController:
    return request.app.state.auth_controller


@router.post("/auth/signup", response_model=AuthResponse, status_code=201)
async def signup(request: Request, payload: RegisterRequest, response: Response, service=Depends(get_auth_service)) -> AuthResponse:
    controller = AuthController(service)
    result = await controller.register(request, payload)
    controller.apply_auth_cookies(response, result)
    return result


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: Request, payload: LoginRequest, response: Response, service=Depends(get_auth_service)) -> AuthResponse:
    controller = AuthController(service)
    result = await controller.login(request, payload)
    controller.apply_auth_cookies(response, result)
    return result


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh(request: Request, payload: RefreshRequest, response: Response, service=Depends(get_auth_service)) -> AuthResponse:
    controller = AuthController(service)
    result = await controller.refresh(request, payload)
    controller.apply_auth_cookies(response, result)
    return result


@router.post("/auth/logout", status_code=204)
async def logout(request: Request, payload: LogoutRequest, response: Response, service=Depends(get_auth_service)) -> Response:
    controller = AuthController(service)
    await controller.logout(request, payload, response)
    return response


@router.get("/auth/profile", response_model=MeResponse)
async def profile(request: Request, service=Depends(get_auth_service)) -> MeResponse:
    return await AuthController(service).me(request)


@router.post("/register", include_in_schema=False)
async def register_alias(request: Request, payload: RegisterRequest, response: Response, service=Depends(get_auth_service)) -> AuthResponse:
    result = await signup(request, payload, response, service)
    return result


@router.post("/login", include_in_schema=False)
async def login_alias(request: Request, payload: LoginRequest, response: Response, service=Depends(get_auth_service)) -> AuthResponse:
    result = await login(request, payload, response, service)
    return result


@router.post("/refresh", include_in_schema=False)
async def refresh_alias(request: Request, payload: RefreshRequest, response: Response, service=Depends(get_auth_service)) -> AuthResponse:
    result = await refresh(request, payload, response, service)
    return result


@router.post("/logout", include_in_schema=False)
async def logout_alias(request: Request, payload: LogoutRequest, response: Response, service=Depends(get_auth_service)) -> Response:
    return await logout(request, payload, response, service)


@router.get("/me", include_in_schema=False, response_model=MeResponse)
async def me_alias(request: Request, service=Depends(get_auth_service)) -> MeResponse:
    return await profile(request, service)
