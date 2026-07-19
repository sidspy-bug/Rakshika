"""
Rakshika — Unit Tests for User, Emergency, Community Services
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock


@pytest.fixture(autouse=True)
def setup_services_app_states():
    """Fixture to automatically initialize app.state variables for user, emergency, and community services."""
    from services.user_service.app.main import app as user_app
    from services.user_service.app.core.config import get_settings as get_user_settings
    user_app.state.settings = get_user_settings()
    user_app.state.db = AsyncMock()
    
    from services.emergency_service.app.main import app as emergency_app
    from services.emergency_service.app.core.config import get_settings as get_emergency_settings
    emergency_app.state.settings = get_emergency_settings()
    emergency_app.state.db = AsyncMock()
    
    from services.community_service.app.main import app as community_app
    from services.community_service.app.core.config import get_settings as get_community_settings
    community_app.state.settings = get_community_settings()
    community_app.state.db = AsyncMock()


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ── User Service ─────────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_user_service_health():
    """Test user-service health endpoint."""
    from services.user_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["service"] == "Rakshika User Service"


@pytest.mark.anyio
async def test_user_profile_requires_auth():
    """Test that profile endpoint requires auth headers."""
    from services.user_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/api/v1/users/me")
        # Should fail without auth header
        assert response.status_code in [401, 403, 422]


# ── Emergency Service ────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_emergency_service_health():
    """Test emergency-service health endpoint."""
    from services.emergency_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["service"] == "Rakshika Emergency Service"


@pytest.mark.anyio
async def test_sos_trigger_requires_auth():
    """Test that SOS trigger endpoint requires authentication."""
    from services.emergency_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.post("/api/v1/emergencies/sos", json={
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
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["service"] == "Rakshika Community Service"
