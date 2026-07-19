"""
Rakshika — Unit Tests for Gateway Service and Firebase Authentication
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(autouse=True)
def setup_gateway_app_state():
    """Fixture to automatically initialize app.state variables for the gateway."""
    from services.gateway.app.main import app
    from services.gateway.app.core.config import get_settings
    
    app.state.settings = get_settings()
    app.state.redis_client = AsyncMock()
    app.state.http_client = AsyncMock()
    app.state.gateway_service = AsyncMock()
    app.state.gateway_controller = AsyncMock()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_gateway_health_check():
    """Test that the gateway health endpoint returns 200."""
    from services.gateway.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


@pytest.mark.anyio
async def test_gateway_docs_endpoint():
    """Test that OpenAPI docs are accessible."""
    from services.gateway.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.get("/docs")
        assert response.status_code == 200


@pytest.mark.anyio
async def test_gateway_firebase_token_validation():
    """Verify that GatewaySecurityGuard correctly decodes and validates Firebase ID Tokens using RS256."""
    from services.gateway.app.core.security import GatewaySecurityGuard
    from services.gateway.app.core.config import GatewaySettings, RouteRegistry
    import jwt
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    
    # 1. Generate in-memory RSA keypair for JWT signatures signing
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode("utf-8")
    
    # 2. Extract public keyPEM
    public_key = private_key.public_key()
    pem_public = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")
    
    # 3. Create mock Firebase claims payload
    payload = {
        "sub": "firebase-uid-12345",
        "email": "test@rakshika.org",
        "roles": ["responder"],
        "permissions": ["dispatch"],
        "aud": "rakshika-safety",
        "iss": "https://securetoken.google.com/rakshika-safety"
    }
    
    # Encode token with kid parameter in JWT header
    token = jwt.encode(payload, pem_private, algorithm="RS256", headers={"kid": "mock-kid-1"})
    
    # 4. Initialize Guard
    settings = GatewaySettings()
    settings.firebase_project_id = "rakshika-safety"
    route_registry = RouteRegistry(settings)
    guard = GatewaySecurityGuard(settings, route_registry)
    
    # Mock dynamic google certificates response
    guard._get_firebase_public_keys = AsyncMock(return_value={"mock-kid-1": pem_public})
    
    # 5. Mock request state and call
    request = MagicMock()
    request.url.path = "/api/v1/users/me"
    request.headers = {"Authorization": f"Bearer {token}"}
    request.state = MagicMock()
    
    auth_result = await guard.authenticate(request)
    
    # Assert values are verified
    assert auth_result.principal is not None
    assert auth_result.principal.email == "test@rakshika.org"
    assert "responder" in auth_result.principal.roles
    assert auth_result.token == token
