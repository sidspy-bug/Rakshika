"""Request and response translation for gateway proxying."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from fastapi import Request

from services.shared.constants.app import HEADER_REQUEST_ID, HEADER_TRACE_ID

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}

FORWARD_HEADERS = {
    HEADER_REQUEST_ID.lower(),
    HEADER_TRACE_ID.lower(),
    "authorization",
    "content-type",
    "accept",
    "accept-encoding",
    "accept-language",
    "user-agent",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-forwarded-host",
}

RESPONSE_HEADERS = {
    "content-type",
    "cache-control",
    "content-language",
    "content-location",
    "etag",
    "location",
    "set-cookie",
    "vary",
}


@dataclass(slots=True)
class ProxyRequest:
    """Normalized data for forwarding a request."""

    method: str
    url: str
    headers: dict[str, str]
    body: bytes


@dataclass(slots=True)
class ProxyResponse:
    """Normalized upstream response data."""

    status_code: int
    headers: dict[str, str]
    body: bytes


def build_proxy_request(
    request: Request,
    upstream_url: str,
    *,
    request_id: str,
    trace_id: str,
    body: bytes = b"",
) -> ProxyRequest:
    """Translate an incoming FastAPI request into a forwarded request payload."""

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and (key.lower() in FORWARD_HEADERS or key.lower().startswith("x-"))
    }
    headers[HEADER_REQUEST_ID] = request_id
    headers[HEADER_TRACE_ID] = trace_id
    headers.setdefault("x-forwarded-for", request.client.host if request.client is not None else "unknown")
    headers.setdefault("x-forwarded-proto", request.url.scheme)
    headers.setdefault("x-forwarded-host", request.url.hostname or "unknown")
    return ProxyRequest(method=request.method, url=upstream_url, headers=headers, body=body)


def filter_response_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Keep only headers safe to forward back to the client."""

    return {
        key: value
        for key, value in headers.items()
        if key.lower() in RESPONSE_HEADERS and key.lower() not in HOP_BY_HOP_HEADERS
    }
