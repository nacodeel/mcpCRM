import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import request_id_var

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        token = request_id_var.set(request_id)
        request.state.request_id = request_id
        try:
            response = await call_next(request)
            response.headers["x-request-id"] = request_id
            return response
        finally:
            request_id_var.reset(token)


class ProcessTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        started = time.perf_counter()
        try:
            response = await call_next(request)
            return response
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "request completed",
                extra={
                    "extra": {
                        "method": request.method,
                        "path": request.url.path,
                        "elapsed_ms": elapsed_ms,
                    },
                },
            )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        response: Response = await call_next(request)
        response.headers.setdefault("x-content-type-options", "nosniff")
        response.headers.setdefault("x-frame-options", "DENY")
        response.headers.setdefault("referrer-policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("permissions-policy", "geolocation=(), microphone=(), camera=()")
        return response


class McpAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"].startswith("/mcp"):
            import urllib.parse
            from app.modules.mcp.service import McpService

            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization", b"").decode("utf-8")
            raw_key = ""

            if auth_header.lower().startswith("bearer "):
                raw_key = auth_header[7:].strip()

            if not raw_key:
                query_string = scope.get("query_string", b"").decode("utf-8")
                params = urllib.parse.parse_qs(query_string)
                token_list = params.get("token") or params.get("apiKey")
                if token_list:
                    raw_key = token_list[0]

            if not raw_key:
                await send({
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [(b"content-type", b"application/json")]
                })
                await send({
                    "type": "http.response.body",
                    "body": b'{"error":"Unauthorized: MCP key is required"}'
                })
                return

            db = getattr(scope["app"].state, "db", None)
            notifications = getattr(scope["app"].state, "notifications", None)
            if not db:
                await send({
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [(b"content-type", b"application/json")]
                })
                await send({
                    "type": "http.response.body",
                    "body": b'{"error":"Database manager is not initialized"}'
                })
                return

            try:
                service = McpService(db, notifications)
                principal = await service.authenticate(raw_key)

                from app.modules.mcp.fastmcp_server import current_mcp_principal
                token = current_mcp_principal.set(principal)

                try:
                    await self.app(scope, receive, send)
                finally:
                    current_mcp_principal.reset(token)
                return
            except Exception as exc:
                await send({
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [(b"content-type", b"application/json")]
                })
                await send({
                    "type": "http.response.body",
                    "body": f'{{"error":"Unauthorized: {str(exc)}"}}'.encode("utf-8")
                })
                return

        await self.app(scope, receive, send)

