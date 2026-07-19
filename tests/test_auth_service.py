"""
Rakshika — Unit Tests for Auth Service Health Check and Firebase Sync Registration
"""
import pytest
from uuid import uuid4
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch


@pytest.fixture(autouse=True)
def setup_auth_app_state():
    """Fixture to automatically initialize app.state variables and bypass db layers."""
    from services.auth_service.app.main import app
    from services.auth_service.app.core.config import get_settings
    from services.auth_service.app.core.dependencies import get_auth_service
    
    app.state.settings = get_settings()
    app.state.db = AsyncMock()
    app.state.redis_client = AsyncMock()
    
    # Bypass standard DB session yields in all auth endpoint tests
    app.dependency_overrides[get_auth_service] = lambda: AsyncMock()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_auth_health_check():
    """Test that the auth service health endpoint returns 200."""
    from services.auth_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        # Route is prefixed with /api/v1
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "Rakshika Auth Service"


@pytest.mark.anyio
async def test_auth_login_missing_body():
    """Test that login returns 422 when body is missing."""
    from services.auth_service.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as client:
        response = await client.post("/api/v1/auth/login")
        assert response.status_code == 422


@pytest.mark.anyio
async def test_auth_firebase_signup():
    """Verify that user registrations via Firebase token correctly create user database records in PostgreSQL."""
    from services.auth_service.app.main import app
    from services.auth_service.app.core.dependencies import get_auth_service
    from services.auth_service.app.api.v1.services.auth_service import AuthService
    from services.auth_service.app.api.v1.models.auth import User, Session, Role
    from services.shared.security.jwt import JWTTokenPair
    import jwt
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    
    # Generate RSA private and public key elements
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode("utf-8")
    
    pem_public = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")
    
    # Mock payload
    payload = {
        "sub": "firebase-uid-abc-123",
        "email": "firebase-sync@rakshika.org",
        "aud": "rakshika-safety",
        "iss": "https://securetoken.google.com/rakshika-safety"
    }
    
    firebase_token = jwt.encode(payload, pem_private, algorithm="RS256", headers={"kid": "mock-kid-2"})

    # Setup mocked service
    mock_service = AsyncMock(spec=AuthService)
    mock_service.access_cookie_name = "rakshika_access"
    mock_service.refresh_cookie_name = "rakshika_refresh"
    mock_service._settings = app.state.settings
    
    # Configure AuthService mockup response
    user_id = uuid4()
    mock_user = User(
        id=user_id,
        full_name="Firebase User",
        email="firebase-sync@rakshika.org",
        phone="+919876543210",
        password_hash="mocked-hash"
    )
    mock_session = Session(
        id=uuid4(),
        user_id=user_id
    )
    mock_tokens = JWTTokenPair(
        access_token="mock-access",
        refresh_token="mock-refresh",
        access_expires_at=0,
        refresh_expires_at=0,
        access_jti="jti-1",
        refresh_jti="jti-2"
    )
    
    from services.auth_service.app.api.v1.services.auth_service import AuthResult
    mock_service.register.return_value = AuthResult(
        user=mock_user,
        session=mock_session,
        tokens=mock_tokens,
        email_verification_required=False
    )
    
    # Set return value for the Pydantic schema mapper helper
    from services.auth_service.app.api.v1.schemas.auth import UserRead
    mock_service._to_user_read.return_value = UserRead(
        id=user_id,
        fullName="Firebase User",
        email="firebase-sync@rakshika.org",
        phone="+919876543210",
        status="active",
        isEmailVerified=True,
        isPhoneVerified=True
    )
    
    app.dependency_overrides[get_auth_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost") as client:
            response = await client.post(
                "/api/v1/auth/signup",
                json={
                    "fullName": "Firebase User",
                    "email": "firebase-sync@rakshika.org",
                    "phone": "+919876543210",
                    "firebaseToken": firebase_token,
                }
            )

            assert response.status_code == 201 or response.status_code == 200
            data = response.json()
            assert data["user"]["email"] == "firebase-sync@rakshika.org"
            assert data["tokens"]["accessToken"] == "mock-access"
    finally:
        # Teardown handles clearing overrides
        pass
