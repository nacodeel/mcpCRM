from typing import Any

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, DbManagerDep
from app.core.serialization import success_payload
from app.modules.crm.service import CrmService

router = APIRouter()


@router.get("")
async def search_all(
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    q: str = Query(min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    service = CrmService(manager)
    return success_payload(await service.search_all(current_user.id, query=q, limit=limit))
