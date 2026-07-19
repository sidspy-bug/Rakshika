"""
Rakshika — Unit Tests for Location Service and PostGIS Geofencing Checks
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_location_service_health():
    """Test location-service health endpoint."""
    from services.location_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.anyio
async def test_geofence_check_mocked():
    """Test that geofencing checks return correct mock results when coordinates are sent."""
    from services.location_service.app.main import app
    from services.location_service.app.core.dependencies import get_location_service
    
    mock_service = AsyncMock()
    
    mock_result = {
        "isInDangerZone": True,
        "nearestDangerDistance": 12.5,
        "nearestDangerTitle": "Active emergency reported 13m away",
        "isInSafeZone": True,
        "nearestSafeDistance": 50.0,
        "nearestSafeName": "Connaught Place Safe Corridor",
    }
    mock_service.check_geofence.return_value = mock_result

    # Override dependency directly in FastAPI dependency_overrides registry
    app.dependency_overrides[get_location_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post(
                "/api/v1/location/check-geofence",
                json={
                    "latitude": 28.6139,
                    "longitude": 77.2090,
                    "radiusMeters": 200.0,
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["isInDangerZone"] is True
            assert data["nearestDangerDistance"] == 12.5
            assert data["isInSafeZone"] is True
            assert data["nearestSafeName"] == "Connaught Place Safe Corridor"
            
            mock_service.check_geofence.assert_called_once_with(28.6139, 77.2090, 200.0)
    finally:
        # Clear dependency override after test run
        app.dependency_overrides.clear()
