"""Generic FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends

from ..logging.context import RequestContext, get_request_context
from ..schemas.pagination import PaginationParams


def get_request_context_dependency() -> RequestContext | None:
    """Expose the active request context to route handlers."""

    return get_request_context()


def get_pagination_params(params: PaginationParams = Depends()) -> PaginationParams:
    """Return normalized pagination parameters."""

    return params
