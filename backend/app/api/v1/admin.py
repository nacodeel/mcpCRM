from fastapi import APIRouter

from app.api.deps import AdminUserDep
from app.core.responses import MessageResponse

router = APIRouter()


@router.get("/status", response_model=MessageResponse)
async def admin_status(_: AdminUserDep) -> MessageResponse:
    return MessageResponse(message="admin access granted")
