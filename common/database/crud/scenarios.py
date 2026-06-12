from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select

from ..enums import ContactStatus, DealStatus, UserRole
from ..models.crm import Contact, Deal


class CrmScenarioCRUD:
    """High-level CRM scenarios bound to one AsyncSession.

    These methods intentionally combine several repositories so that application
    code and MCP tools can perform common multi-step operations with one call.
    """

    def __init__(self, crud):
        self.crud = crud
        self.session = crud.session

    async def ensure_local_admin(
        self,
        *,
        username: str,
        name: str,
        password_hash: str | None = None,
    ):
        return await self.crud.users.get_or_create(
            username=username,
            defaults={
                "name": name,
                "password_hash": password_hash,
                "role": UserRole.ADMIN,
                "is_active": True,
            },
        )

    async def create_contact_full(
        self,
        *,
        user_id: int,
        first_name: str | None = None,
        last_name: str | None = None,
        middle_name: str | None = None,
        birth_date: date | None = None,
        source: str | None = None,
        status: ContactStatus | str = ContactStatus.NEW,
        phones: Sequence[str] | None = None,
        emails: Sequence[str] | None = None,
        addresses: Sequence[str] | None = None,
        tags: Sequence[str] | None = None,
        note: str | None = None,
    ) -> Contact:
        contact = await self.crud.contacts.create(
            user_id=user_id,
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            birth_date=birth_date,
            source=source,
            status=status,
        )

        for index, phone in enumerate(phones or []):
            await self.crud.contact_phones.add_phone(contact_id=contact.id, phone=phone, is_primary=index == 0)

        for index, email in enumerate(emails or []):
            await self.crud.contact_emails.add_email(contact_id=contact.id, email=email, is_primary=index == 0)

        for index, address in enumerate(addresses or []):
            await self.crud.contact_addresses.add_address(contact_id=contact.id, address=address, is_primary=index == 0)

        for tag in tags or []:
            await self.crud.contact_tags.add_tag(user_id, contact.id, tag)

        if note:
            await self.crud.contact_notes.add_note(user_id=user_id, contact_id=contact.id, note=note)

        await self.crud.flush()
        full = await self.crud.contacts.get_full(contact.id)
        return full or contact

    async def update_contact_full(
        self,
        contact_id: int,
        *,
        first_name: str | None = None,
        last_name: str | None = None,
        middle_name: str | None = None,
        birth_date: date | None = None,
        source: str | None = None,
        status: ContactStatus | str | None = None,
        phones_to_add: Sequence[str] | None = None,
        emails_to_add: Sequence[str] | None = None,
        addresses_to_add: Sequence[str] | None = None,
        tags_to_add: Sequence[str] | None = None,
        note: str | None = None,
    ) -> Contact:
        contact = await self.crud.contacts.require(contact_id)
        update_data: dict[str, Any] = {
            "first_name": first_name,
            "last_name": last_name,
            "middle_name": middle_name,
            "birth_date": birth_date,
            "source": source,
            "status": status,
        }
        contact = await self.crud.contacts.update(contact, **update_data)

        for phone in phones_to_add or []:
            await self.crud.contact_phones.add_phone(contact_id=contact.id, phone=phone)
        for email in emails_to_add or []:
            await self.crud.contact_emails.add_email(contact_id=contact.id, email=email)
        for address in addresses_to_add or []:
            await self.crud.contact_addresses.add_address(contact_id=contact.id, address=address)
        for tag in tags_to_add or []:
            await self.crud.contact_tags.add_tag(contact.user_id, contact.id, tag)
        if note:
            await self.crud.contact_notes.add_note(user_id=contact.user_id, contact_id=contact.id, note=note)

        await self.crud.flush()
        full = await self.crud.contacts.get_full(contact.id)
        return full or contact

    async def upsert_contact_by_phone(
        self,
        *,
        user_id: int,
        phone: str,
        first_name: str | None = None,
        last_name: str | None = None,
        middle_name: str | None = None,
        source: str | None = None,
        status: ContactStatus | str | None = None,
        emails: Sequence[str] | None = None,
        tags: Sequence[str] | None = None,
        note: str | None = None,
    ) -> tuple[Contact, bool]:
        contact = await self.crud.contacts.find_by_phone(user_id, phone)
        created = False
        if contact is None:
            contact = await self.create_contact_full(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status or ContactStatus.NEW,
                phones=[phone],
                emails=emails,
                tags=tags,
                note=note,
            )
            created = True
        else:
            contact = await self.update_contact_full(
                contact.id,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status,
                emails_to_add=emails,
                tags_to_add=tags,
                note=note,
            )
        return contact, created

    async def upsert_contact_by_email(
        self,
        *,
        user_id: int,
        email: str,
        first_name: str | None = None,
        last_name: str | None = None,
        middle_name: str | None = None,
        source: str | None = None,
        status: ContactStatus | str | None = None,
        phones: Sequence[str] | None = None,
        tags: Sequence[str] | None = None,
        note: str | None = None,
    ) -> tuple[Contact, bool]:
        contact = await self.crud.contacts.find_by_email(user_id, email)
        created = False
        if contact is None:
            contact = await self.create_contact_full(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status or ContactStatus.NEW,
                phones=phones,
                emails=[email],
                tags=tags,
                note=note,
            )
            created = True
        else:
            contact = await self.update_contact_full(
                contact.id,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status,
                phones_to_add=phones,
                tags_to_add=tags,
                note=note,
            )
        return contact, created

    async def create_contact_with_deal(
        self,
        *,
        user_id: int,
        deal_title: str,
        deal_description: str | None = None,
        deal_amount: Decimal | float | str | None = None,
        deal_currency: str = "RUB",
        deal_comment: str | None = None,
        deal_status: DealStatus | str = DealStatus.NEW,
        first_name: str | None = None,
        last_name: str | None = None,
        middle_name: str | None = None,
        phones: Sequence[str] | None = None,
        emails: Sequence[str] | None = None,
        addresses: Sequence[str] | None = None,
        tags: Sequence[str] | None = None,
        note: str | None = None,
        source: str | None = None,
        contact_status: ContactStatus | str = ContactStatus.LEAD,
    ) -> tuple[Contact, Deal]:
        contact = await self.create_contact_full(
            user_id=user_id,
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            phones=phones,
            emails=emails,
            addresses=addresses,
            tags=tags,
            note=note,
            source=source,
            status=contact_status,
        )
        deal = await self.crud.deals.create_for_contact(
            user_id=user_id,
            contact_id=contact.id,
            title=deal_title,
            description=deal_description,
            amount=deal_amount,
            currency=deal_currency,
            comment=deal_comment,
            status=deal_status,
        )
        full = await self.crud.contacts.get_full(contact.id)
        return full or contact, deal

    async def mcp_ingest_contact(
        self,
        *,
        user_id: int,
        phone: str | None = None,
        email: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        middle_name: str | None = None,
        source: str | None = "MCP",
        status: ContactStatus | str | None = ContactStatus.LEAD,
        tags: Sequence[str] | None = None,
        note: str | None = None,
        deal: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if phone:
            contact, created = await self.upsert_contact_by_phone(
                user_id=user_id,
                phone=phone,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status,
                emails=[email] if email else None,
                tags=tags,
                note=note,
            )
        elif email:
            contact, created = await self.upsert_contact_by_email(
                user_id=user_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status,
                tags=tags,
                note=note,
            )
        else:
            contact = await self.create_contact_full(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                source=source,
                status=status or ContactStatus.NEW,
                tags=tags,
                note=note,
            )
            created = True

        created_deal = None
        if deal:
            created_deal = await self.crud.deals.create_for_contact(
                user_id=user_id,
                contact_id=contact.id,
                title=deal["title"],
                description=deal.get("description"),
                amount=deal.get("amount"),
                currency=deal.get("currency", "RUB"),
                comment=deal.get("comment"),
                status=deal.get("status", DealStatus.NEW),
            )

        return {
            "contact": await self.crud.contacts.get_full(contact.id) or contact,
            "created": created,
            "deal": created_deal,
        }

    async def get_contact_card(self, contact_id: int) -> Contact | None:
        return await self.crud.contacts.get_full(contact_id)

    async def search_all(self, user_id: int, query: str, *, limit: int = 20) -> dict[str, list[Any]]:
        return {
            "contacts": await self.crud.contacts.search(user_id, query, limit=limit),
            "deals": await self.crud.deals.search(user_id, query, limit=limit),
        }

    async def dashboard(self, user_id: int) -> dict[str, Any]:
        contacts_stmt = (
            select(Contact.status, func.count(Contact.id))
            .where(Contact.user_id == user_id)
            .group_by(Contact.status)
        )
        deals_stmt = (
            select(Deal.status, func.count(Deal.id), func.coalesce(func.sum(Deal.amount), 0))
            .where(Deal.user_id == user_id)
            .group_by(Deal.status)
        )

        contacts_rows = (await self.session.execute(contacts_stmt)).all()
        deals_rows = (await self.session.execute(deals_stmt)).all()

        return {
            "contacts": {
                status.value: {"count": int(count), "ru": status.ru}
                for status, count in contacts_rows
            },
            "deals": {
                status.value: {
                    "count": int(count),
                    "amount": str(amount),
                    "ru": status.ru,
                }
                for status, count, amount in deals_rows
            },
        }
