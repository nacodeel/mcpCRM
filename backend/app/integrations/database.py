from importlib import import_module
from typing import Any, Protocol, runtime_checkable

from app.core.config import Settings


@runtime_checkable
class DatabaseSessionManagerProtocol(Protocol):
    async def init_database(self) -> None: ...
    async def dispose(self) -> None: ...
    def session(self): ...  # noqa: ANN201
    def transaction(self): ...  # noqa: ANN201
    def crud(self): ...  # noqa: ANN201
    def transactional_crud(self): ...  # noqa: ANN201


def build_database_manager(settings: Settings) -> DatabaseSessionManagerProtocol:
    try:
        session_module = import_module("database.session")
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "External database module is not available. "
            "Mount it as ./database:/app/database or copy it into project root."
        ) from exc

    try:
        build_session_manager = getattr(session_module, "build_session_manager")
    except AttributeError as exc:
        raise RuntimeError("database.session must export build_session_manager") from exc

    kwargs: dict[str, Any] = {
        "database_url": settings.DATABASE_URL,
        "echo": settings.DB_ECHO,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
    }

    try:
        return build_session_manager(**kwargs)
    except TypeError:
        # Compatibility fallback for simpler generated database modules.
        return build_session_manager(settings.DATABASE_URL)
