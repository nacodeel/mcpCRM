from typing import Any

from app.core.events import NotificationHub
from app.core.exceptions import NotFoundError
from app.integrations.database import DatabaseSessionManagerProtocol
from app.modules.crm.schemas import (
    ContactCreateRequest,
    ContactUpdateRequest,
    DealCreateRequest,
    DealUpdateRequest,
)


class CrmService:
    def __init__(
        self,
        db: DatabaseSessionManagerProtocol,
        notifications: NotificationHub | None = None,
    ) -> None:
        self.db = db
        self.notifications = notifications

    async def list_contacts(self, user_id: int, *, page: int = 1, per_page: int = 50) -> Any:
        async with self.db.crud() as crud:
            contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
            if contacts is None:
                raise RuntimeError("database CRUD must expose contacts repository")
            if hasattr(contacts, "page_by_user"):
                return await contacts.page_by_user(user_id, page=page, per_page=per_page)
            if hasattr(contacts, "page"):
                return await contacts.page(
                    filter_by={"user_id": user_id}, page=page, per_page=per_page
                )
            return await contacts.by_user(user_id)

    async def create_contact(self, user_id: int, payload: ContactCreateRequest) -> Any:
        async with self.db.transactional_crud() as crud:
            scenarios = getattr(crud, "scenarios", getattr(crud, "scenario", None))
            data = payload.model_dump(exclude_none=True)
            if scenarios is not None and hasattr(scenarios, "create_contact_full"):
                contact = await scenarios.create_contact_full(user_id=user_id, **data)
            else:
                contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
                contact = await contacts.create(user_id=user_id, **data)
        await self._publish(
            user_id,
            "crm.contact.created",
            "Контакт создан",
            f"Создан контакт #{getattr(contact, 'id', '')}",
            {"contact_id": getattr(contact, "id", None)},
        )
        return contact

    async def get_contact(self, user_id: int, contact_id: int) -> Any:
        async with self.db.crud() as crud:
            contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
            contact = None
            if hasattr(contacts, "get_full"):
                contact = await contacts.get_full(contact_id)
            else:
                contact = await contacts.get(contact_id)
            if contact is None or getattr(contact, "user_id", user_id) != user_id:
                raise NotFoundError("Contact not found")
            return contact

    async def update_contact(
        self,
        user_id: int,
        contact_id: int,
        payload: ContactUpdateRequest,
    ) -> Any:
        async with self.db.transactional_crud() as crud:
            contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
            existing = await contacts.get(contact_id)
            if existing is None or getattr(existing, "user_id", user_id) != user_id:
                raise NotFoundError("Contact not found")
            scenarios = getattr(crud, "scenarios", getattr(crud, "scenario", None))
            data = payload.model_dump(exclude_none=True)
            if "phones" in data:
                data["phones_to_add"] = data.pop("phones")
            if "emails" in data:
                data["emails_to_add"] = data.pop("emails")
            if "addresses" in data:
                data["addresses_to_add"] = data.pop("addresses")
            if "tags" in data:
                data["tags_to_add"] = data.pop("tags")

            if scenarios is not None and hasattr(scenarios, "update_contact_full"):
                contact = await scenarios.update_contact_full(contact_id=contact_id, **data)
            else:
                contact = await contacts.update(existing, **data)
        await self._publish(
            user_id,
            "crm.contact.updated",
            "Контакт обновлен",
            f"Обновлен контакт #{contact_id}",
            {"contact_id": contact_id},
        )
        return contact

    async def delete_contact(self, user_id: int, contact_id: int) -> None:
        async with self.db.transactional_crud() as crud:
            contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
            contact = await contacts.get(contact_id)
            if contact is None or getattr(contact, "user_id", user_id) != user_id:
                raise NotFoundError("Contact not found")
            await contacts.delete(contact)
        await self._publish(
            user_id,
            "crm.contact.deleted",
            "Контакт удален",
            f"Удален контакт #{contact_id}",
            {"contact_id": contact_id},
        )

    async def list_deals(self, user_id: int, *, page: int = 1, per_page: int = 50) -> Any:
        async with self.db.crud() as crud:
            deals = getattr(crud, "deals", getattr(crud, "deal", None))
            if deals is None:
                raise RuntimeError("database CRUD must expose deals repository")
            if hasattr(deals, "page"):
                return await deals.page(
                    filter_by={"user_id": user_id}, page=page, per_page=per_page
                )
            if hasattr(deals, "by_user"):
                return await deals.by_user(user_id)
            raise RuntimeError("database deals repository must expose page or by_user")

    async def create_deal(self, user_id: int, payload: DealCreateRequest) -> Any:
        async with self.db.transactional_crud() as crud:
            contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
            contact = await contacts.get(payload.contact_id)
            if contact is None or getattr(contact, "user_id", user_id) != user_id:
                raise NotFoundError("Contact not found")
            deals = getattr(crud, "deals", getattr(crud, "deal", None))
            data = payload.model_dump(exclude_none=True)
            deal = await deals.create(user_id=user_id, **data)
        await self._publish(
            user_id,
            "crm.deal.created",
            "Сделка создана",
            f"Создана сделка #{getattr(deal, 'id', '')}",
            {"deal_id": getattr(deal, "id", None), "contact_id": payload.contact_id},
        )
        return deal

    async def update_deal(self, user_id: int, deal_id: int, payload: DealUpdateRequest) -> Any:
        async with self.db.transactional_crud() as crud:
            deals = getattr(crud, "deals", getattr(crud, "deal", None))
            deal = await deals.get(deal_id)
            if deal is None or getattr(deal, "user_id", user_id) != user_id:
                raise NotFoundError("Deal not found")
            data = payload.model_dump(exclude_none=True)
            if "contact_id" in data:
                contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
                contact = await contacts.get(data["contact_id"])
                if contact is None or getattr(contact, "user_id", user_id) != user_id:
                    raise NotFoundError("Contact not found")
            deal = await deals.update(deal, **data)
        await self._publish(
            user_id,
            "crm.deal.updated",
            "Сделка обновлена",
            f"Обновлена сделка #{deal_id}",
            {"deal_id": deal_id},
        )
        return deal

    async def delete_deal(self, user_id: int, deal_id: int) -> None:
        async with self.db.transactional_crud() as crud:
            deals = getattr(crud, "deals", getattr(crud, "deal", None))
            deal = await deals.get(deal_id)
            if deal is None or getattr(deal, "user_id", user_id) != user_id:
                raise NotFoundError("Deal not found")
            await deals.delete(deal)
        await self._publish(
            user_id,
            "crm.deal.deleted",
            "Сделка удалена",
            f"Удалена сделка #{deal_id}",
            {"deal_id": deal_id},
        )

    async def get_deal(self, user_id: int, deal_id: int) -> Any:
        async with self.db.crud() as crud:
            deals = getattr(crud, "deals", getattr(crud, "deal", None))
            deal = (
                await deals.get_full(deal_id)
                if hasattr(deals, "get_full")
                else await deals.get(deal_id)
            )
            if deal is None or getattr(deal, "user_id", user_id) != user_id:
                raise NotFoundError("Deal not found")
            return deal

    async def dashboard(self, user_id: int) -> Any:
        async with self.db.crud() as crud:
            scenarios = getattr(crud, "scenarios", getattr(crud, "scenario", None))
            if scenarios is None or not hasattr(scenarios, "dashboard"):
                raise RuntimeError("database CRUD must expose scenarios.dashboard")
            return await scenarios.dashboard(user_id=user_id)

    async def search_all(self, user_id: int, *, query: str, limit: int = 20) -> Any:
        async with self.db.crud() as crud:
            scenarios = getattr(crud, "scenarios", getattr(crud, "scenario", None))
            if scenarios is not None and hasattr(scenarios, "search_all"):
                return await scenarios.search_all(user_id=user_id, query=query, limit=limit)
            result: dict[str, Any] = {}
            contacts = getattr(crud, "contacts", getattr(crud, "contact", None))
            deals = getattr(crud, "deals", getattr(crud, "deal", None))
            if contacts is not None and hasattr(contacts, "search"):
                result["contacts"] = await contacts.search(user_id, query, limit=limit)
            if deals is not None and hasattr(deals, "search"):
                result["deals"] = await deals.search(user_id, query, limit=limit)
            return result

    async def _publish(
        self,
        user_id: int,
        event_type: str,
        title: str,
        message: str,
        payload: dict[str, object],
    ) -> None:
        if self.notifications is None:
            return
            
        try:
            from app.modules.mcp.fastmcp_server import current_mcp_principal
            principal = current_mcp_principal.get()
            if principal:
                title = f"🤖 AI-Агент: {title}"
                agent_name = principal.name or "Интеграция"
                message = f"[{agent_name}] {message}"
        except Exception:
            pass

        await self.notifications.publish(
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            payload=payload,
        )
