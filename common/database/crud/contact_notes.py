from __future__ import annotations

from ..base import BaseCRUD
from ..models.crm import ContactNote


class ContactNoteCRUD(BaseCRUD[ContactNote]):
    default_ordering = ("-created_at", "-id")

    def __init__(self, session):
        super().__init__(session, ContactNote)

    async def by_user(self, user_id: int, *, limit: int | None = None) -> list[ContactNote]:
        return await self.list(ContactNote.user_id == user_id, order_by=("-created_at", "-id"), limit=limit)

    async def page_by_user(self, user_id: int, *, page: int = 1, per_page: int = 50):
        return await self.page(ContactNote.user_id == user_id, order_by=("-created_at", "-id"), page=page, per_page=per_page)

    async def by_contact(self, contact_id: int, *, limit: int | None = None) -> list[ContactNote]:
        return await self.list(ContactNote.contact_id == contact_id, order_by=("-created_at", "-id"), limit=limit)

    async def latest_for_contact(self, contact_id: int, *, limit: int = 10) -> list[ContactNote]:
        return await self.by_contact(contact_id, limit=limit)

    async def add_note(self, *, user_id: int, contact_id: int, note: str) -> ContactNote:
        cleaned = note.strip()
        if not cleaned:
            raise ValueError("note must not be empty")
        return await self.create(user_id=user_id, contact_id=contact_id, note=cleaned)
