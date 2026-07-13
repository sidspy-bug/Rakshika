"""Common application exception hierarchy."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class AppError(Exception):
    """Base class for service-level exceptions."""

    message: str
    code: str = "app_error"
    status_code: int = 400
    details: dict[str, object] = field(default_factory=dict)

    def __str__(self) -> str:
        return self.message


class ValidationError(AppError):
    """Input validation failed."""

    code = "validation_error"
    status_code = 422


class AuthenticationError(AppError):
    """Authentication failed or token is invalid."""

    code = "authentication_error"
    status_code = 401


class AuthorizationError(AppError):
    """Authorization failed."""

    code = "authorization_error"
    status_code = 403


class NotFoundError(AppError):
    """Requested resource does not exist."""

    code = "not_found"
    status_code = 404


class ConflictError(AppError):
    """Requested operation conflicts with current state."""

    code = "conflict"
    status_code = 409
