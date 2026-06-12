from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from ..base import BaseCRUD
from ..models.crm import ContactPhone
from ..utils import normalize_phone_number


class ContactPhoneCRUD(BaseCRUD[ContactPhone]):
    def __init__(self, session):
        super().__init__(session, ContactPhone)

    def prepare_create_data(self, data: Mapping[str, Any]) -> dict[str, Any]:
        payload = dict(data)
        if payload.get("phone") is not None:
            payload["phone"] = normalize_phone_number(str(payload["phone"]))
        return super().prepare_create_data(payload)

    def prepare_update_data(self, data: Mapping[str, Any], *, exclude_none: bool = True) -> dict[str, Any]:
        payload = dict(data)
        if payload.get("phone") is not None:
            payload["phone"] = normalize_phone_number(str(payload["phone"]))
        return super().prepare_update_data(payload, exclude_none=exclude_none)

    async def by_contact(self, contact_id: int) -> list[ContactPhone]:
        return await self.list(ContactPhone.contact_id == contact_id, order_by=("-is_primary", "id"))

    async def get_by_phone(self, phone: str) -> ContactPhone | None:
        return await self.get_one(ContactPhone.phone == normalize_phone_number(phone))

    async def get_by_contact_and_phone(self, contact_id: int, phone: str) -> ContactPhone | None:
        return await self.get_one(
            ContactPhone.contact_id == contact_id,
            ContactPhone.phone == normalize_phone_number(phone),
        )

    async def set_primary(self, phone_id: int) -> ContactPhone:
        phone = await self.require(phone_id)
        await self.update_many(
            ContactPhone.contact_id == phone.contact_id,
            values={"is_primary": False},
            allow_all=False,
        )
        phone.is_primary = True
        return await self.save(phone, refresh=True)

    async def add_phone(
        self,
        *,
        contact_id: int,
        phone: str,
        is_primary: bool = False,
    ) -> ContactPhone:
        obj, created = await self.get_or_create(
            contact_id=contact_id,
            phone=normalize_phone_number(phone),
            defaults={"is_primary": is_primary},
        )
        if is_primary:
            obj = await self.set_primary(obj.id)
        elif created:
            phones_count = await self.count(ContactPhone.contact_id == contact_id)
            if phones_count == 1:
                obj = await self.set_primary(obj.id)
        return obj
