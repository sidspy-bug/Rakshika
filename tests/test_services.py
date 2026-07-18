"""
Rakshika — Unit Tests for User, Emergency, Community Services
"""
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ── User Service ─────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_user_service_health():
    """Test user-service health endpoint."""
    from services.user_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["service"] == "user-service"


@pytest.mark.anyio
async def test_user_profile_requires_auth():
    """Test that profile endpoint requires auth headers."""
    from services.user_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/users/profile")
        # Should fail without auth header
        assert response.status_code in [401, 403, 422]


# ── Emergency Service ────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_emergency_service_health():
    """Test emergency-service health endpoint."""
    from services.emergency_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["service"] == "emergency-service"


@pytest.mark.anyio
async def test_sos_trigger_requires_auth():
    """Test that SOS trigger endpoint requires authentication."""
    from services.emergency_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/emergencies/trigger", json={
            "trigger_type": "manual",
            "latitude": 28.6145,
            "longitude": 77.2085,
        })
        assert response.status_code in [401, 403, 422]


# ── Community Service ────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_community_service_health():
    """Test community-service health endpoint."""
    from services.community_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["service"] == "community-service"
