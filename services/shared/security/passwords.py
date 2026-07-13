"""Password hashing helpers."""

from __future__ import annotations

from passlib.context import CryptContext

_password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password."""

    return _password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored hash."""

    return _password_context.verify(password, hashed_password)


def password_needs_rehash(hashed_password: str) -> bool:
    """Return whether a password hash should be upgraded."""

    return _password_context.needs_update(hashed_password)
