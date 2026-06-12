from __future__ import annotations

from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .crud import CRUD
from .models.base import create_all


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    return database_url


class DatabaseSessionManager:
    def __init__(
        self,
        database_url: str,
        *,
        echo: bool = False,
        pool_pre_ping: bool = True,
        engine_kwargs: Mapping[str, Any] | None = None,
        session_kwargs: Mapping[str, Any] | None = None,
    ):
        self.database_url = normalize_database_url(database_url)
        resolved_engine_kwargs = dict(engine_kwargs or {})
        resolved_engine_kwargs.setdefault("echo", echo)
        resolved_engine_kwargs.setdefault("pool_pre_ping", pool_pre_ping)

        self.engine: AsyncEngine = create_async_engine(self.database_url, **resolved_engine_kwargs)

        resolved_session_kwargs = dict(session_kwargs or {})
        resolved_session_kwargs.setdefault("expire_on_commit", False)
        resolved_session_kwargs.setdefault("autoflush", False)

        self.session_factory = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            **resolved_session_kwargs,
        )

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        session = self.session_factory()
        try:
            yield session
        except Exception:
            if session.in_transaction():
                await session.rollback()
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[AsyncSession]:
        async with self.session_factory() as session:
            async with session.begin():
                yield session

    @asynccontextmanager
    async def crud(self) -> AsyncIterator[CRUD]:
        async with self.session() as session:
            yield CRUD(session)

    @asynccontextmanager
    async def transactional_crud(self) -> AsyncIterator[CRUD]:
        async with self.transaction() as session:
            yield CRUD(session)

    async def init_database(self) -> None:
        await create_all(self.engine)

    async def dispose(self) -> None:
        await self.engine.dispose()


def build_session_manager(database_url: str, **kwargs: Any) -> DatabaseSessionManager:
    return DatabaseSessionManager(database_url, **kwargs)


try:
    from core import settings as _settings
except Exception:
    _settings = None

manager: DatabaseSessionManager | None = (
    build_session_manager(_settings.database_url, echo=getattr(_settings, "database_echo", False))
    if _settings is not None and getattr(_settings, "database_url", None)
    else None
)
engine: AsyncEngine | None = manager.engine if manager is not None else None
SessionLocal = manager.session_factory if manager is not None else None


def _require_manager() -> DatabaseSessionManager:
    if manager is None:
        raise RuntimeError(
            "Global database manager is not configured. "
            "Create DatabaseSessionManager(database_url) explicitly or provide core.settings.database_url."
        )
    return manager


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    async with _require_manager().session() as session:
        yield session


@asynccontextmanager
async def get_transactional_session() -> AsyncIterator[AsyncSession]:
    async with _require_manager().transaction() as session:
        yield session


@asynccontextmanager
async def get_crud() -> AsyncIterator[CRUD]:
    async with _require_manager().crud() as crud:
        yield crud


@asynccontextmanager
async def get_transactional_crud() -> AsyncIterator[CRUD]:
    async with _require_manager().transactional_crud() as crud:
        yield crud


async def init_database() -> None:
    await _require_manager().init_database()


__all__ = [
    "normalize_database_url",
    "DatabaseSessionManager",
    "build_session_manager",
    "manager",
    "engine",
    "SessionLocal",
    "get_session",
    "get_transactional_session",
    "get_crud",
    "get_transactional_crud",
    "init_database",
]
