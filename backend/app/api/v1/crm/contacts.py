from typing import Any

from fastapi import APIRouter, status

from app.api.deps import CurrentUserDep, DbManagerDep, NotificationHubDep
from app.core.serialization import success_payload
from app.modules.crm.schemas import ContactCreateRequest, ContactUpdateRequest
from app.modules.crm.service import CrmService

router = APIRouter()


@router.get("")
async def list_contacts(
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    page: int = 1,
    per_page: int = 50,
) -> dict[str, Any]:
    service = CrmService(manager)
    return success_payload(
        await service.list_contacts(current_user.id, page=page, per_page=per_page)
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_contact(
    payload: ContactCreateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    hub: NotificationHubDep,
) -> dict[str, Any]:
    service = CrmService(manager, hub)
    return success_payload(await service.create_contact(current_user.id, payload))


@router.get("/{contact_id}")
async def get_contact(
    contact_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> dict[str, Any]:
    service = CrmService(manager)
    return success_payload(await service.get_contact(current_user.id, contact_id))


@router.patch("/{contact_id}")
async def update_contact(
    contact_id: int,
    payload: ContactUpdateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    hub: NotificationHubDep,
) -> dict[str, Any]:
    service = CrmService(manager, hub)
    return success_payload(await service.update_contact(current_user.id, contact_id, payload))


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    hub: NotificationHubDep,
) -> None:
    service = CrmService(manager, hub)
    await service.delete_contact(current_user.id, contact_id)
