"""Request-scoped logging context."""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass


@dataclass(slots=True)
class RequestContext:
    """Information that should follow a request across logs."""

    request_id: str | None = None
    trace_id: str | None = None
    user_id: str | None = None
    session_id: str | None = None
    path: str | None = None
    method: str | None = None


_request_context: ContextVar[RequestContext | None] = ContextVar("rakshika_request_context", default=None)


def set_request_context(context: RequestContext) -> None:
    """Store the active request context."""

    _request_context.set(context)


def clear_request_context() -> None:
    """Clear the active request context."""

    _request_context.set(None)


def get_request_context() -> RequestContext | None:
    """Return the current request context, if any."""

    return _request_context.get()
