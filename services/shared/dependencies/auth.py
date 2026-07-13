"""Authentication-related dependencies."""

from __future__ import annotations

from fastapi import Header, HTTPException, status

from ..constants.app import HTTP_HEADER_AUTHORIZATION


def get_bearer_token(authorization: str | None = Header(default=None, alias=HTTP_HEADER_AUTHORIZATION)) -> str:
    """Extract a bearer token from the Authorization header."""

    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    return token


from services.shared.security.authorization import Principal
from fastapi import Request
from uuid import UUID

def get_current_principal(request: Request) -> Principal:
    """Extract authenticated principal headers forwarded by the API Gateway."""

    user_id = request.headers.get("x-authenticated-user-id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authenticated user credentials")
    
    roles_str = request.headers.get("x-authenticated-roles") or ""
    roles = {r.strip() for r in roles_str.split(",") if r.strip()}

    perms_str = request.headers.get("x-authenticated-permissions") or ""
    permissions = {p.strip() for p in perms_str.split(",") if p.strip()}

    session_id = request.headers.get("x-authenticated-session-id")
    device_id = request.headers.get("x-authenticated-device-id")

    return Principal(
        user_id=UUID(user_id),
        roles=roles,
        permissions=permissions,
        session_id=UUID(session_id) if session_id else None,
        device_id=UUID(device_id) if device_id else None,
    )

