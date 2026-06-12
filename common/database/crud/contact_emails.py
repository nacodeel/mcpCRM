from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from ..base import BaseCRUD
from ..models.crm import ContactEmail
from ..utils import normalize_email


class ContactEmailCRUD(BaseCRUD[ContactEmail]):
    def __init__(self, session):
        super().__init__(session, ContactEmail)

    def prepare_create_data(self, data: Mapping[str, Any]) -> dict[str, Any]:
        payload = dict(data)
        if payload.get("email") is not None:
            payload["email"] = normalize_email(str(payload["email"]))
        return super().prepare_create_data(payload)

    def prepare_update_data(self, data: Mapping[str, Any], *, exclude_none: bool = True) -> dict[str, Any]:
        payload = dict(data)
        if payload.get("email") is not None:
            payload["email"] = normalize_email(str(payload["email"]))
        return super().prepare_update_data(payload, exclude_none=exclude_none)

    async def by_contact(self, contact_id: int) -> list[ContactEmail]:
        return await self.list(ContactEmail.contact_id == contact_id, order_by=("-is_primary", "id"))

    async def get_by_email(self, email: str) -> ContactEmail | None:
        return await self.get_one(ContactEmail.email == normalize_email(email))

    async def get_by_contact_and_email(self, contact_id: int, email: str) -> ContactEmail | None:
        return await self.get_one(
            ContactEmail.contact_id == contact_id,
            ContactEmail.email == normalize_email(email),
        )

    async def set_primary(self, email_id: int) -> ContactEmail:
        email = await self.require(email_id)
        await self.update_many(
            ContactEmail.contact_id == email.contact_id,
            values={"is_primary": False},
            allow_all=False,
        )
        email.is_primary = True
        return await self.save(email, refresh=True)

    async def add_email(
        self,
        *,
        contact_id: int,
        email: str,
        is_primary: bool = False,
    ) -> ContactEmail:
        obj, created = await self.get_or_create(
            contact_id=contact_id,
            email=normalize_email(email),
            defaults={"is_primary": is_primary},
        )
        if is_primary:
            obj = await self.set_primary(obj.id)
        elif created:
            emails_count = await self.count(ContactEmail.contact_id == contact_id)
            if emails_count == 1:
                obj = await self.set_primary(obj.id)
        return obj
