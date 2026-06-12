from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.deps import CurrentUserDep, DbManagerDep, NotificationHubDep
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.core.serialization import success_payload
from app.modules.users.service import UserService

router = APIRouter()


@router.get("")
async def list_notifications(
    current_user: CurrentUserDep,
    hub: NotificationHubDep,
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    return success_payload(await hub.history(current_user.id, limit=limit))


@router.websocket("/ws")
async def notifications_ws(
    websocket: WebSocket,
    manager: DbManagerDep,
    token: str = Query(default=""),
) -> None:
    if not token:
        await websocket.close(code=1008, reason="JWT token query parameter is required")
        return

    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if not subject:
            raise UnauthorizedError("Token subject is missing")
        user = await UserService(manager).get_active_user_by_id(int(subject))
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return

    hub = getattr(websocket.app.state, "notifications", None)
    if hub is None:
        await websocket.close(code=1011, reason="Notification hub is not initialized")
        return

    try:
        await hub.websocket_loop(websocket, user_id=user.id)
    except WebSocketDisconnect:
        return
