"""
Rakshika — Unit Tests for Auth Service Health Check
"""
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_auth_health_check():
    """Test that the auth service health endpoint returns 200."""
    from services.auth_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "auth-service"


@pytest.mark.anyio
async def test_auth_login_missing_body():
    """Test that login returns 422 when body is missing."""
    from services.auth_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login")
        assert response.status_code == 422
