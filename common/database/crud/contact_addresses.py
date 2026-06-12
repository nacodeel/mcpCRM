from __future__ import annotations

from ..base import BaseCRUD
from ..models.crm import ContactAddress


class ContactAddressCRUD(BaseCRUD[ContactAddress]):
    def __init__(self, session):
        super().__init__(session, ContactAddress)

    async def by_contact(self, contact_id: int) -> list[ContactAddress]:
        return await self.list(ContactAddress.contact_id == contact_id, order_by=("-is_primary", "id"))

    async def set_primary(self, address_id: int) -> ContactAddress:
        address = await self.require(address_id)
        await self.update_many(
            ContactAddress.contact_id == address.contact_id,
            values={"is_primary": False},
            allow_all=False,
        )
        address.is_primary = True
        return await self.save(address, refresh=True)

    async def add_address(
        self,
        *,
        contact_id: int,
        address: str,
        is_primary: bool = False,
    ) -> ContactAddress:
        obj = await self.create(contact_id=contact_id, address=address.strip(), is_primary=is_primary)
        if is_primary:
            obj = await self.set_primary(obj.id)
        else:
            addresses_count = await self.count(ContactAddress.contact_id == contact_id)
            if addresses_count == 1:
                obj = await self.set_primary(obj.id)
        return obj
