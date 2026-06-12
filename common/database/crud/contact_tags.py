from __future__ import annotations

from ..base import BaseCRUD
from ..models.crm import ContactTag


class ContactTagCRUD(BaseCRUD[ContactTag]):
    def __init__(self, session):
        super().__init__(session, ContactTag)

    async def by_user(self, user_id: int, *, limit: int | None = None) -> list[ContactTag]:
        return await self.list(ContactTag.user_id == user_id, order_by=("tag", "id"), limit=limit)

    async def by_contact(self, contact_id: int) -> list[ContactTag]:
        return await self.list(ContactTag.contact_id == contact_id, order_by=("tag", "id"))

    async def get_by_contact_and_tag(self, contact_id: int, tag: str) -> ContactTag | None:
        return await self.get_one(ContactTag.contact_id == contact_id, ContactTag.tag == tag.strip())

    async def add_tag(self, user_id: int, contact_id: int, tag: str) -> ContactTag:
        cleaned = tag.strip()
        if not cleaned:
            raise ValueError("tag must not be empty")
        obj, _ = await self.get_or_create(user_id=user_id, contact_id=contact_id, tag=cleaned)
        return obj

    async def add_many(self, user_id: int, contact_id: int, tags: list[str] | tuple[str, ...]) -> list[ContactTag]:
        result: list[ContactTag] = []
        for tag in tags:
            result.append(await self.add_tag(user_id, contact_id, tag))
        return result

    async def remove_tag(self, user_id: int, contact_id: int, tag: str) -> bool:
        obj = await self.get_one(
            ContactTag.user_id == user_id,
            ContactTag.contact_id == contact_id,
            ContactTag.tag == tag.strip(),
        )
        if obj is None:
            return False
        await self.delete(obj)
        return True
