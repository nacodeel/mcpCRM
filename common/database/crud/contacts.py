from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from ..base import BaseCRUD
from ..enums import ContactStatus
from ..models.crm import Contact, ContactEmail, ContactPhone
from ..utils import build_full_name, normalize_email, normalize_phone_number


class ContactCRUD(BaseCRUD[Contact]):
    def __init__(self, session):
        super().__init__(session, Contact)

    def _with_full_name(self, data: Mapping[str, Any]) -> dict[str, Any]:
        payload = dict(data)
        name_fields = {"first_name", "last_name", "middle_name"}
        if "full_name" not in payload and name_fields.intersection(payload):
            payload["full_name"] = build_full_name(
                last_name=payload.get("last_name"),
                first_name=payload.get("first_name"),
                middle_name=payload.get("middle_name"),
            )
        return payload

    def prepare_create_data(self, data: Mapping[str, Any]) -> dict[str, Any]:
        return super().prepare_create_data(self._with_full_name(data))

    def prepare_update_data(self, data: Mapping[str, Any], *, exclude_none: bool = True) -> dict[str, Any]:
        # For updates full_name must be rebuilt using existing values, not only passed fields.
        return super().prepare_update_data(data, exclude_none=exclude_none)

    async def update(
        self,
        obj: Contact,
        *,
        refresh: bool = True,
        exclude_none: bool = True,
        **data: Any,
    ) -> Contact:
        payload = self.prepare_update_data(data, exclude_none=exclude_none)
        if payload:
            self.apply_updates(obj, payload)
            if {"first_name", "last_name", "middle_name"}.intersection(payload) and "full_name" not in payload:
                obj.rebuild_full_name()
        return await self.save(obj, refresh=refresh)

    async def by_user(
        self,
        user_id: int,
        *,
        status: ContactStatus | str | None = None,
        limit: int | None = None,
    ) -> list[Contact]:
        filters = [Contact.user_id == user_id]
        if status is not None:
            filters.append(Contact.status == status)
        return await self.list(*filters, order_by=("last_name", "first_name", "id"), limit=limit)

    async def page_by_user(
        self,
        user_id: int,
        *,
        status: ContactStatus | str | None = None,
        page: int = 1,
        per_page: int = 50,
    ):
        filters = [Contact.user_id == user_id]
        if status is not None:
            filters.append(Contact.status == status)
        return await self.page(*filters, order_by=("last_name", "first_name", "id"), page=page, per_page=per_page)

    async def by_status(
        self,
        user_id: int,
        status: ContactStatus | str,
        *,
        limit: int | None = None,
    ) -> list[Contact]:
        return await self.by_user(user_id, status=status, limit=limit)

    async def get_full(self, contact_id: int) -> Contact | None:
        return await self.get(
            contact_id,
            options=[
                selectinload(Contact.user),
                selectinload(Contact.phones),
                selectinload(Contact.emails),
                selectinload(Contact.addresses),
                selectinload(Contact.tags),
                selectinload(Contact.notes),
                selectinload(Contact.deals),
            ],
        )

    async def search(self, user_id: int, query: str, *, limit: int = 50) -> list[Contact]:
        pattern = f"%{query.strip()}%"
        return await self.list(
            Contact.user_id == user_id,
            or_(
                Contact.first_name.ilike(pattern),
                Contact.last_name.ilike(pattern),
                Contact.middle_name.ilike(pattern),
                Contact.full_name.ilike(pattern),
                Contact.source.ilike(pattern),
            ),
            order_by=("last_name", "first_name", "id"),
            limit=limit,
        )

    async def set_status(self, contact_id: int, status: ContactStatus | str) -> Contact:
        return await self.update_by_id(contact_id, status=status)

    async def find_by_phone(self, user_id: int, phone: str) -> Contact | None:
        normalized = normalize_phone_number(phone)
        stmt = (
            select(Contact)
            .join(ContactPhone, ContactPhone.contact_id == Contact.id)
            .where(Contact.user_id == user_id, ContactPhone.phone == normalized)
            .options(
                selectinload(Contact.phones),
                selectinload(Contact.emails),
                selectinload(Contact.tags),
            )
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def find_by_email(self, user_id: int, email: str) -> Contact | None:
        normalized = normalize_email(email)
        stmt = (
            select(Contact)
            .join(ContactEmail, ContactEmail.contact_id == Contact.id)
            .where(Contact.user_id == user_id, ContactEmail.email == normalized)
            .options(
                selectinload(Contact.phones),
                selectinload(Contact.emails),
                selectinload(Contact.tags),
            )
            .limit(1)
        )
        return await self.session.scalar(stmt)
