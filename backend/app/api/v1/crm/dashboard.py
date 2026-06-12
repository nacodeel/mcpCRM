from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, DbManagerDep
from app.core.serialization import success_payload
from app.modules.crm.service import CrmService

router = APIRouter()


@router.get("")
async def dashboard(current_user: CurrentUserDep, manager: DbManagerDep) -> dict[str, Any]:
    service = CrmService(manager)
    return success_payload(await service.dashboard(current_user.id))
