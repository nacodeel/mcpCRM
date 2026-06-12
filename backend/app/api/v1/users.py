from fastapi import APIRouter

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError

from app.api.deps import AdminUserDep, CurrentUserDep, UserServiceDep
from app.modules.users.schemas import BootstrapAdminRequest, UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUserDep) -> UserRead:
    return UserRead.from_db(current_user)


@router.post("/bootstrap-admin", response_model=UserRead)
async def bootstrap_admin(
    payload: BootstrapAdminRequest,
    service: UserServiceDep,
) -> UserRead:
    if not get_settings().BOOTSTRAP_ADMIN_ENABLED:
        raise ForbiddenError("Admin bootstrap is disabled")
    user = await service.bootstrap_admin(payload)
    return UserRead.from_db(user)


@router.get("/admin-check", response_model=UserRead)
async def admin_check(admin: AdminUserDep) -> UserRead:
    return UserRead.from_db(admin)
