"""
Rakshika — Unit Tests for Gateway Service
"""
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_gateway_health_check():
    """Test that the gateway health endpoint returns 200."""
    from services.gateway.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.anyio
async def test_gateway_docs_endpoint():
    """Test that OpenAPI docs are accessible."""
    from services.gateway.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/docs")
        assert response.status_code == 200
