"""Shared application constants."""

from __future__ import annotations

API_V1_PREFIX = "/api/v1"
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

HEADER_REQUEST_ID = "X-Request-ID"
HEADER_TRACE_ID = "X-Trace-ID"
HTTP_HEADER_AUTHORIZATION = "Authorization"
HTTP_HEADER_X_FORWARDED_FOR = "X-Forwarded-For"

REQUEST_CONTEXT_KEY = "request_context"

TOKEN_COOKIE_ACCESS = "rakshika_access_token"
TOKEN_COOKIE_REFRESH = "rakshika_refresh_token"
