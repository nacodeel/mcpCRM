from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.events import NotificationHub
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import (
    ProcessTimeMiddleware,
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
)
from app.integrations.database import build_database_manager
from app.observability.telemetry import setup_telemetry
from app.modules.mcp.fastmcp_server import mcp, configure_mcp_runtime


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    setup_logging(settings)

    db_manager = build_database_manager(settings)
    notifications = NotificationHub(
        history_size=settings.NOTIFICATION_HISTORY_SIZE
    )

    app.state.db = db_manager
    app.state.notifications = notifications

    configure_mcp_runtime(db_manager, notifications)

    if settings.AUTO_CREATE_DATABASE:
        await db_manager.init_database()

    from app.core.seeding import bootstrap_database

    try:
        await bootstrap_database(db_manager)
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error("Failed to bootstrap database: %s", exc)

    setup_telemetry(app, settings)

    try:
        if settings.MCP_AUTH_ENABLED:
            if hasattr(mcp, "session_manager") and getattr(mcp.session_manager, "_has_started", False):
                yield
            else:
                async with mcp.session_manager.run():
                    yield
        else:
            yield
    finally:
        configure_mcp_runtime(None, None)
        await db_manager.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
    )

    register_exception_handlers(app)

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(ProcessTimeMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Mcp-Session-Id"],
    )

    app.include_router(api_router)

    if settings.MCP_AUTH_ENABLED:
        app.mount("/mcp", mcp.streamable_http_app())

    return app