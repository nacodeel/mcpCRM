from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, DbManagerDep
from app.modules.crm.schemas import DealCreateRequest
from app.modules.crm.service import CrmService

router = APIRouter()


@router.get("")
async def list_deals(
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    page: int = 1,
    per_page: int = 50,
) -> Any:
    service = CrmService(manager)
    return await service.list_deals(current_user.id, page=page, per_page=per_page)


@router.post("")
async def create_deal(
    payload: DealCreateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> Any:
    service = CrmService(manager)
    return await service.create_deal(current_user.id, payload)


@router.get("/{deal_id}")
async def get_deal(
    deal_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> Any:
    service = CrmService(manager)
    return await service.get_deal(current_user.id, deal_id)
