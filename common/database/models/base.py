from __future__ import annotations

from datetime import datetime
from typing import Iterable

from sqlalchemy import DateTime, MetaData, func, text
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "idx_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

DB_SCHEMAS: tuple[str, ...] = ("crm",)

metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    metadata = metadata


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UpdatedAtMixin:
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def load_all_models() -> None:
    from . import crm  # noqa: F401


async def create_schemas(engine: AsyncEngine, schemas: Iterable[str] = DB_SCHEMAS) -> None:
    async with engine.begin() as conn:
        for schema in schemas:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))


async def create_all(engine: AsyncEngine) -> None:
    load_all_models()
    async with engine.begin() as conn:
        for schema in DB_SCHEMAS:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
        await conn.run_sync(Base.metadata.create_all)


async def drop_all(engine: AsyncEngine) -> None:
    load_all_models()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


__all__ = [
    "Base",
    "TimestampMixin",
    "UpdatedAtMixin",
    "DB_SCHEMAS",
    "create_schemas",
    "create_all",
    "drop_all",
    "load_all_models",
]
