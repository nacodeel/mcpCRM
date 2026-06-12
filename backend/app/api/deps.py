from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import Depends, Header, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.config import get_settings
from app.core.events import NotificationHub
from app.core.exceptions import UnauthorizedError
from app.core.permissions import require_admin_user
from app.core.security import decode_access_token
from app.integrations.database import DatabaseSessionManagerProtocol
from app.modules.users.service import UserService

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/token")


def get_db_manager(request: Request) -> DatabaseSessionManagerProtocol:
    manager = getattr(request.app.state, "db", None)
    if manager is None:
        raise RuntimeError("Database manager is not initialized")
    return manager


DbManagerDep = Annotated[DatabaseSessionManagerProtocol, Depends(get_db_manager)]


def get_notification_hub(request: Request) -> NotificationHub:
    hub = getattr(request.app.state, "notifications", None)
    if hub is None:
        raise RuntimeError("Notification hub is not initialized")
    return hub


NotificationHubDep = Annotated[NotificationHub, Depends(get_notification_hub)]


async def get_crud(manager: DbManagerDep) -> AsyncIterator[Any]:
    async with manager.crud() as crud:
        yield crud


async def get_tx_crud(manager: DbManagerDep) -> AsyncIterator[Any]:
    async with manager.transactional_crud() as crud:
        yield crud


CrudDep = Annotated[Any, Depends(get_crud)]
TxCrudDep = Annotated[Any, Depends(get_tx_crud)]


def get_user_service(manager: DbManagerDep) -> UserService:
    return UserService(manager)



UserServiceDep = Annotated[UserService, Depends(get_user_service)]


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    service: UserServiceDep,
) -> Any:
    payload = decode_access_token(token)
    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token subject is missing")
    try:
        user_id: int | str = int(subject)
    except (TypeError, ValueError):
        user_id = str(subject)
    return await service.get_active_user_by_id(user_id)


CurrentUserDep = Annotated[Any, Depends(get_current_user)]


def get_admin_user(current_user: CurrentUserDep) -> Any:
    return require_admin_user(current_user)


AdminUserDep = Annotated[Any, Depends(get_admin_user)]



