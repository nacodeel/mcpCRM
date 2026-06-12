from __future__ import annotations

from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import NoInspectionAvailable


def to_jsonable(value: Any) -> Any:
    """Convert ORM/Pydantic/domain objects into a safe API payload."""
    if isinstance(value, Enum):
        return value.value
    if value is None or isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, BaseModel):
        return to_jsonable(value.model_dump(mode="json"))
    if isinstance(value, Mapping):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, tuple) and hasattr(value, "_mapping"):
        return to_jsonable(dict(value._mapping))
    if isinstance(value, list | tuple | set | frozenset):
        return [to_jsonable(item) for item in value]

    try:
        state = sa_inspect(value)
    except NoInspectionAvailable:
        return value

    payload: dict[str, Any] = {}
    for column in state.mapper.column_attrs:
        payload[column.key] = to_jsonable(getattr(value, column.key))

    for relationship in state.mapper.relationships:
        if relationship.key in state.unloaded:
            continue
        payload[relationship.key] = to_jsonable(getattr(value, relationship.key))

    for attr_name in ("status_ru", "role_ru"):
        if hasattr(value, attr_name):
            payload[attr_name] = to_jsonable(getattr(value, attr_name))

    return payload


def success_payload(data: Any = None, *, meta: Mapping[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": to_jsonable(data)}
    if meta:
        payload["meta"] = to_jsonable(dict(meta))
    return payload
