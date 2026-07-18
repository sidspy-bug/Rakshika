"""Structured JSON logging helpers."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from ..config.settings import LoggingSettings
from .context import get_request_context


class JsonFormatter(logging.Formatter):
    """Render log records as JSON lines."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401 - inherited contract
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        context = get_request_context()
        if context is not None:
            payload.update(
                {
                    "request_id": context.request_id,
                    "trace_id": context.trace_id,
                    "user_id": context.user_id,
                    "session_id": context.session_id,
                    "path": context.path,
                    "method": context.method,
                }
            )
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def inject_log_record_context() -> None:
    """Patch the logging record factory to inject request context fields."""

    original_factory = logging.getLogRecordFactory()

    def record_factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
        record = original_factory(*args, **kwargs)
        context = get_request_context()
        record.request_id = getattr(context, "request_id", None)
        record.trace_id = getattr(context, "trace_id", None)
        record.user_id = getattr(context, "user_id", None)
        record.session_id = getattr(context, "session_id", None)
        return record

    logging.setLogRecordFactory(record_factory)


def configure_logging(settings: LoggingSettings) -> None:
    """Configure process-wide logging."""

    inject_log_record_context()
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(settings.level.upper())

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter() if settings.json_logs else logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger."""

    return logging.getLogger(name)
