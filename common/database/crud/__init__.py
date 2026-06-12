from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from ..base import BaseCRUD
from .contact_addresses import ContactAddressCRUD
from .contact_emails import ContactEmailCRUD
from .contact_notes import ContactNoteCRUD
from .contact_phones import ContactPhoneCRUD
from .contact_tags import ContactTagCRUD
from .contacts import ContactCRUD
from .deals import DealCRUD
from .mcp_keys import McpKeyCRUD
from .scenarios import CrmScenarioCRUD
from .users import UserCRUD


class CRUD:
    """Single async entrypoint for all repositories bound to one AsyncSession."""

    def __init__(self, session: AsyncSession):
        self.session = session

        self.user = UserCRUD(session)
        self.mcp_key = McpKeyCRUD(session)
        self.contact = ContactCRUD(session)
        self.contact_phone = ContactPhoneCRUD(session)
        self.contact_email = ContactEmailCRUD(session)
        self.contact_address = ContactAddressCRUD(session)
        self.contact_tag = ContactTagCRUD(session)
        self.contact_note = ContactNoteCRUD(session)
        self.deal = DealCRUD(session)
        self.scenario = CrmScenarioCRUD(self)

        self.users = self.user
        self.mcp_keys = self.mcp_key
        self.contacts = self.contact
        self.contact_phones = self.contact_phone
        self.contact_emails = self.contact_email
        self.contact_addresses = self.contact_address
        self.contact_tags = self.contact_tag
        self.contact_notes = self.contact_note
        self.deals = self.deal
        self.scenarios = self.scenario

    @property
    def db(self) -> AsyncSession:
        return self.session

    async def flush(self) -> None:
        await self.session.flush()

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()


__all__ = [
    "BaseCRUD",
    "CRUD",
    "UserCRUD",
    "McpKeyCRUD",
    "ContactCRUD",
    "ContactPhoneCRUD",
    "ContactEmailCRUD",
    "ContactAddressCRUD",
    "ContactTagCRUD",
    "ContactNoteCRUD",
    "DealCRUD",
    "CrmScenarioCRUD",
]
