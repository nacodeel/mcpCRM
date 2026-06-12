from __future__ import annotations

from sqlalchemy import Enum


def pg_enum(enum_cls, name: str, *, schema: str = "crm") -> Enum:
    """Create PostgreSQL native enum type for SQLAlchemy models."""

    return Enum(
        enum_cls,
        name=name,
        schema=schema,
        native_enum=True,
        create_constraint=True,
        validate_strings=True,
    )


__all__ = ["pg_enum"]
