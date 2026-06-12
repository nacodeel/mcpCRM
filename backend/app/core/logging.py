import contextvars
import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

from app.core.config import Settings

request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id",
    default=None,
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = request_id_var.get()
        if request_id:
            payload["request_id"] = request_id
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        for key, value in getattr(record, "extra", {}).items():
            payload[key] = value
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(settings: Settings) -> None:
    root = logging.getLogger()
    root.setLevel(settings.LOG_LEVEL.upper())
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_JSON:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"),
        )
    root.addHandler(handler)

    logging.getLogger("uvicorn.access").disabled = True
