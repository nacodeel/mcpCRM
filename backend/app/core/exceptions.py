from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "app_error"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class BadRequestError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "bad_request"


class ServiceUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "service_unavailable"


def error_payload(
    *,
    code: str,
    message: str,
    details: dict[str, Any] | list[Any] | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": request_id,
        },
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=exc.status_code,
            content=error_payload(
                code=exc.code,
                message=exc.message,
                details=exc.details,
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> ORJSONResponse:
        errors = exc.errors()
        # Build a human-readable message from the first error
        first_msg = "Request validation error"
        if errors:
            first = errors[0]
            loc = " -> ".join(str(l) for l in first.get("loc", []) if l != "body")
            msg = first.get("msg", "")
            first_msg = f"{loc}: {msg}" if loc else msg
        return ORJSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_payload(
                code="validation_error",
                message=first_msg,
                details={"errors": errors},
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=exc.status_code,
            content=error_payload(
                code="http_error",
                message=str(exc.detail),
                request_id=getattr(request.state, "request_id", None),
            ),
        )
    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_payload(
                code="integrity_error",
                message="Database constraint violation",
                details={"reason": str(getattr(exc, "orig", exc))},
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error_payload(
                code="database_error",
                message="Database operation failed",
                details={"type": exc.__class__.__name__},
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_payload(
                code="internal_error",
                message="Internal server error",
                details={"type": exc.__class__.__name__},
                request_id=getattr(request.state, "request_id", None),
            ),
        )
