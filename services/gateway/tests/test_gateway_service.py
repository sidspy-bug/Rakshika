from __future__ import annotations

from dataclasses import dataclass

import pytest
from fastapi import Response
from starlette.requests import Request

from services.gateway.app.api.v1.repositories.gateway_repository import GatewayRepository
from services.gateway.app.api.v1.services.gateway_service import GatewayDependencies, GatewayService
from services.gateway.app.core.config import DownstreamServiceSettings, GatewaySettings, RouteRegistry
from services.gateway.app.core.proxy import ProxyRequest, ProxyResponse
from services.gateway.app.core.rate_limiter import RateLimitResult
from services.gateway.app.core.security import GatewaySecurityGuard


class FakeRepository:
    def __init__(self) -> None:
        self.request_data: ProxyRequest | None = None

    async def forward(self, request_data: ProxyRequest) -> ProxyResponse:
        self.request_data = request_data
        return ProxyResponse(status_code=200, headers={"content-type": "application/json"}, body=b'{"ok":true}')


class FakeRateLimiter:
    async def enforce(self, request: Request) -> RateLimitResult:
        return RateLimitResult(allowed=True, current_count=1, limit=120)


@dataclass(slots=True)
class FakeSecurityGuard:
    async def authenticate(self, request: Request) -> None:
        return None


def build_request(path: str, *, body: bytes = b"", headers: dict[str, str] | None = None) -> Request:
    raw_headers = [(key.lower().encode("latin-1"), value.encode("latin-1")) for key, value in (headers or {}).items()]

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": body, "more_body": False}

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": raw_headers,
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }
    return Request(scope, receive)


@pytest.mark.asyncio
async def test_route_registry_resolves_known_service() -> None:
    settings = GatewaySettings(
        auth_service=DownstreamServiceSettings(base_url="http://auth.local:8000"),
        user_service=DownstreamServiceSettings(base_url="http://user.local:8001"),
    )
    registry = RouteRegistry(settings)

    target = registry.resolve("/api/v1/auth/login")

    assert target.base_url == "http://auth.local:8000"


@pytest.mark.asyncio
async def test_public_proxy_forwards_body_and_headers() -> None:
    settings = GatewaySettings(
        auth_service=DownstreamServiceSettings(base_url="http://auth.local:8000"),
        user_service=DownstreamServiceSettings(base_url="http://user.local:8001"),
    )
    registry = RouteRegistry(settings)
    repository = FakeRepository()
    service = GatewayService(
        GatewayDependencies(
            repository=repository,  # type: ignore[arg-type]
            security_guard=FakeSecurityGuard(),  # type: ignore[arg-type]
            rate_limiter=FakeRateLimiter(),  # type: ignore[arg-type]
            settings=settings,
            redis_client=None,
            route_registry=registry,
        )
    )
    request = build_request("/api/v1/auth/login", body=b'{"email":"test@example.com"}', headers={"user-agent": "pytest"})

    response = await service.forward(request, "auth/login")

    assert response.status_code == 200
    assert response.media_type == "application/json"
    assert repository.request_data is not None
    assert repository.request_data.url == "http://auth.local:8000/auth/login"
    assert repository.request_data.body == b'{"email":"test@example.com"}'
    assert repository.request_data.headers["user-agent"] == "pytest"
