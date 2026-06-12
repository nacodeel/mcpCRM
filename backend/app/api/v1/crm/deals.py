from typing import Any

from fastapi import APIRouter, status

from app.api.deps import CurrentUserDep, DbManagerDep, NotificationHubDep
from app.core.serialization import success_payload
from app.modules.crm.schemas import DealCreateRequest, DealUpdateRequest
from app.modules.crm.service import CrmService

router = APIRouter()


@router.get("")
async def list_deals(
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    page: int = 1,
    per_page: int = 50,
) -> dict[str, Any]:
    service = CrmService(manager)
    return success_payload(await service.list_deals(current_user.id, page=page, per_page=per_page))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_deal(
    payload: DealCreateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    hub: NotificationHubDep,
) -> dict[str, Any]:
    service = CrmService(manager, hub)
    return success_payload(await service.create_deal(current_user.id, payload))


@router.get("/{deal_id}")
async def get_deal(
    deal_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> dict[str, Any]:
    service = CrmService(manager)
    return success_payload(await service.get_deal(current_user.id, deal_id))


@router.patch("/{deal_id}")
async def update_deal(
    deal_id: int,
    payload: DealUpdateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    hub: NotificationHubDep,
) -> dict[str, Any]:
    service = CrmService(manager, hub)
    return success_payload(await service.update_deal(current_user.id, deal_id, payload))


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    hub: NotificationHubDep,
) -> None:
    service = CrmService(manager, hub)
    await service.delete_deal(current_user.id, deal_id)
