"""
Rakshika — Unit Tests for Nearby Responders Network and Feedback Actions
"""
import pytest
from uuid import uuid4
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_community_service_health():
    """Test community-service health endpoint."""
    from services.community_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


@pytest.mark.anyio
async def test_get_nearby_responders_mocked():
    """Test that nearby responders lookup returns mocked responder structures."""
    from services.community_service.app.main import app
    from services.community_service.app.core.dependencies import get_community_service
    from services.community_service.app.api.v1.models.community import CommunityMember

    mock_service = AsyncMock()
    member_id = uuid4()
    user_id = uuid4()
    
    # Create actual ORM model instance so Pydantic model_validate succeeds
    mock_member = CommunityMember(
        id=member_id,
        user_id=user_id,
        availability_status="available",
        responder_radius_km=3.0,
        last_latitude=28.6139,
        last_longitude=77.2090,
    )
    mock_service.get_nearby_responders.return_value = [mock_member]

    app.dependency_overrides[get_community_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.get(
                "/api/v1/community/nearby",
                params={
                    "latitude": 28.6145,
                    "longitude": 77.2085,
                    "radiusKm": 5.0,
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["userId"] == str(user_id)
            assert data[0]["availabilityStatus"] == "available"
            
            mock_service.get_nearby_responders.assert_called_once_with(28.6145, 77.2085, 5.0)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_responder_record_action_mocked():
    """Test recording accept/decline feedback actions from responders."""
    from services.community_service.app.main import app
    from services.community_service.app.core.dependencies import get_community_service
    from services.shared.dependencies import get_current_principal
    from services.shared.security.authorization import Principal
    from services.community_service.app.api.v1.models.community import ResponderAction

    mock_service = AsyncMock()
    emergency_id = uuid4()
    responder_id = uuid4()
    action_id = uuid4()
    
    mock_action = ResponderAction(
        id=action_id,
        emergency_id=emergency_id,
        responder_id=responder_id,
        action="accepted",
        latitude=28.6145,
        longitude=77.2085,
        timestamp=datetime.utcnow(),
    )
    mock_service.record_action.return_value = mock_action

    # Override dependencies
    app.dependency_overrides[get_community_service] = lambda: mock_service
    app.dependency_overrides[get_current_principal] = lambda: Principal(
        user_id=responder_id,
        roles=[]
    )

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post(
                "/api/v1/community/respond",
                json={
                    "emergencyId": str(emergency_id),
                    "action": "accepted",
                    "latitude": 28.6145,
                    "longitude": 77.2085,
                },
                headers={"Authorization": "Bearer mock-token-auth"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["action"] == "accepted"
            assert data["emergencyId"] == str(emergency_id)
            assert data["responderId"] == str(responder_id)
    finally:
        app.dependency_overrides.clear()
