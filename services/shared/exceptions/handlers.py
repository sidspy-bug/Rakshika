"""FastAPI exception handler registration."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ..logging.context import get_request_context
from ..schemas.response import ErrorResponse, ErrorResponseDetail
from .base import AppError


def register_exception_handlers(app: FastAPI) -> None:
    """Register shared exception handlers on a FastAPI application."""

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        context = get_request_context()
        payload = ErrorResponse(
            message=exc.message,
            details=[ErrorResponseDetail(code=exc.code, message=exc.message)],
            request_id=getattr(context, "request_id", None),
            trace_id=getattr(context, "trace_id", None),
        )
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump(mode="json"))

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        context = get_request_context()
        payload = ErrorResponse(
            message="Request validation failed",
            details=[
                ErrorResponseDetail(
                    code="request_validation_error",
                    message=error["msg"],
                    field=".".join(str(part) for part in error.get("loc", [])) or None,
                )
                for error in exc.errors()
            ],
            request_id=getattr(context, "request_id", None),
            trace_id=getattr(context, "trace_id", None),
        )
        return JSONResponse(status_code=422, content=payload.model_dump(mode="json"))
