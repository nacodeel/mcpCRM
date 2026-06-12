from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, DbManagerDep
from app.modules.crm.schemas import ContactCreateRequest, ContactUpdateRequest
from app.modules.crm.service import CrmService

router = APIRouter()


@router.get("")
async def list_contacts(
    current_user: CurrentUserDep,
    manager: DbManagerDep,
    page: int = 1,
    per_page: int = 50,
) -> Any:
    service = CrmService(manager)
    return await service.list_contacts(current_user.id, page=page, per_page=per_page)


@router.post("")
async def create_contact(
    payload: ContactCreateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> Any:
    service = CrmService(manager)
    return await service.create_contact(current_user.id, payload)


@router.get("/{contact_id}")
async def get_contact(
    contact_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> Any:
    service = CrmService(manager)
    return await service.get_contact(current_user.id, contact_id)


@router.patch("/{contact_id}")
async def update_contact(
    contact_id: int,
    payload: ContactUpdateRequest,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> Any:
    service = CrmService(manager)
    return await service.update_contact(current_user.id, contact_id, payload)
