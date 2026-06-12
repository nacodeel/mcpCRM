from __future__ import annotations

import hashlib
import secrets
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from .enums import LocalizedEnum


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number while keeping a leading plus sign.

    Examples:
        "+7 (999) 123-45-67" -> "+79991234567"
        "8 999 123 45 67" -> "89991234567"
    """

    raw = phone.strip()
    has_plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        raise ValueError("phone must contain at least one digit")
    return f"+{digits}" if has_plus else digits


def normalize_email(email: str) -> str:
    """Normalize email for stable lookup and uniqueness."""

    normalized = email.strip().lower()
    if not normalized:
        raise ValueError("email must not be empty")
    return normalized


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def build_full_name(
    *,
    last_name: str | None = None,
    first_name: str | None = None,
    middle_name: str | None = None,
) -> str | None:
    parts = [clean_text(last_name), clean_text(first_name), clean_text(middle_name)]
    full_name = " ".join(part for part in parts if part)
    return full_name or None


def generate_mcp_key(prefix: str = "mcp") -> str:
    """Generate raw MCP key. Store only its hash in DB."""

    token = secrets.token_urlsafe(32)
    return f"{prefix}_{token}"


def hash_key(raw_key: str) -> str:
    """Create deterministic hash for API/MCP key lookup."""

    if not raw_key or not raw_key.strip():
        raise ValueError("raw_key must not be empty")
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def enum_value(value: Any) -> Any:
    if isinstance(value, LocalizedEnum):
        return value.value
    return value


def enum_label(value: Any, *, locale: str = "ru") -> Any:
    if isinstance(value, LocalizedEnum):
        return value.label(locale)
    return value


def to_plain_dict(obj: Any, *, locale: str = "ru") -> dict[str, Any]:
    """Serialize a SQLAlchemy model-like object to a plain dict.

    This helper is intentionally lightweight and does not walk relationships.
    It is useful for API responses where enum fields should include ru labels.
    """

    result: dict[str, Any] = {}
    mapper = getattr(obj, "__mapper__", None)
    if mapper is None:
        return result

    for column in mapper.columns:
        key = column.key
        value = getattr(obj, key)
        if isinstance(value, LocalizedEnum):
            result[key] = value.value
            result[f"{key}_ru"] = value.label(locale)
        elif isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = str(value)
        else:
            result[key] = value
    return result


__all__ = [
    "normalize_phone_number",
    "normalize_email",
    "clean_text",
    "build_full_name",
    "generate_mcp_key",
    "hash_key",
    "enum_value",
    "enum_label",
    "to_plain_dict",
]
