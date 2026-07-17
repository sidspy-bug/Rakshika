"""Middleware for request IDs, trace IDs, and access logging."""

from __future__ import annotations

import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from ..constants.app import HEADER_REQUEST_ID, HEADER_TRACE_ID
from ..logging.context import RequestContext, clear_request_context, set_request_context
from ..utils.ids import new_uuid


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Populate request-scoped logging context for every incoming request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(HEADER_REQUEST_ID) or str(new_uuid())
        trace_id = request.headers.get(HEADER_TRACE_ID) or str(new_uuid())
        client_host = request.client.host if request.client is not None else None
        context = RequestContext(
            request_id=request_id,
            trace_id=trace_id,
            path=request.url.path,
            method=request.method,
        )
        set_request_context(context)
        started_at = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            clear_request_context()

        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        response.headers[HEADER_REQUEST_ID] = request_id
        response.headers[HEADER_TRACE_ID] = trace_id
        logging.getLogger("rakshika.access").info(
            "request completed",
            extra={
                "request_id": request_id,
                "trace_id": trace_id,
                "client_host": client_host,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
