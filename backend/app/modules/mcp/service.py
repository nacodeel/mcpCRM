from typing import Any

from app.core.events import NotificationHub
from app.core.exceptions import BadRequestError, UnauthorizedError
from app.core.serialization import to_jsonable
from app.integrations.database import DatabaseSessionManagerProtocol
from app.modules.crm.schemas import ContactCreateRequest, DealCreateRequest
from app.modules.crm.service import CrmService
from app.modules.mcp.schemas import McpIngestContactRequest, McpPrincipal


class McpService:
    def __init__(
        self,
        db: DatabaseSessionManagerProtocol,
        notifications: NotificationHub | None = None,
    ) -> None:
        self.db = db
        self.notifications = notifications

    async def authenticate(self, raw_key: str) -> McpPrincipal:
        async with self.db.transactional_crud() as crud:
            keys = getattr(crud, "mcp_keys", getattr(crud, "mcp_key", None))
            if keys is None:
                raise RuntimeError("database CRUD must expose mcp_keys repository")

            key_obj = None
            if hasattr(keys, "valid_by_raw_key"):
                key_obj = await keys.valid_by_raw_key(raw_key)
            elif hasattr(keys, "valid_by_hash"):
                from database.utils import hash_key

                key_obj = await keys.valid_by_hash(hash_key(raw_key))

            if key_obj is None:
                raise UnauthorizedError("Invalid MCP key")

            if hasattr(keys, "touch_used"):
                await keys.touch_used(key_obj.id)

            return McpPrincipal(
                user_id=key_obj.user_id,
                key_id=key_obj.id,
                scopes=list(getattr(key_obj, "scopes", []) or []),
                name=getattr(key_obj, "name", None),
            )

    async def list_keys(self, user_id: int) -> list[Any]:
        async with self.db.crud() as crud:
            keys = getattr(crud, "mcp_keys", None)
            if not keys:
                raise RuntimeError("database CRUD must expose mcp_keys")
            return await keys.by_user(user_id)

    async def create_key(self, user_id: int, payload: Any) -> tuple[Any, str]:
        async with self.db.transactional_crud() as crud:
            keys = getattr(crud, "mcp_keys", None)
            if not keys:
                raise RuntimeError("database CRUD must expose mcp_keys")
            
            existing = await keys.by_user(user_id, active_only=True)
            if len(existing) >= 10:
                raise BadRequestError("Maximum of 10 active keys allowed.")

            key_obj, raw_token = await keys.create_key(
                user_id=user_id,
                name=payload.name,
                scopes=payload.scopes,
                expires_at=payload.expires_at,
            )
            return key_obj, raw_token

    async def revoke_key(self, user_id: int, key_id: int) -> None:
        async with self.db.transactional_crud() as crud:
            keys = getattr(crud, "mcp_keys", None)
            if not keys:
                raise RuntimeError("database CRUD must expose mcp_keys")
            
            key_obj = await keys.get(key_id)
            if not key_obj or getattr(key_obj, "user_id", None) != user_id:
                raise UnauthorizedError("Key not found or access denied")
                
            await keys.revoke(key_id)

    async def ingest_contact(
        self,
        principal: McpPrincipal,
        payload: McpIngestContactRequest,
    ) -> dict[str, Any]:
        async with self.db.transactional_crud() as crud:
            scenarios = getattr(crud, "scenarios", getattr(crud, "scenario", None))
            if scenarios is None or not hasattr(scenarios, "mcp_ingest_contact"):
                raise RuntimeError("database CRUD must expose scenarios.mcp_ingest_contact")

            result = await scenarios.mcp_ingest_contact(
                user_id=principal.user_id,
                **payload.model_dump(exclude_none=True),
            )
        result_payload = to_jsonable(result)
        await self._publish(
            principal.user_id,
            "mcp.contact.ingested",
            "MCP обновил CRM",
            "Агент создал или обновил контакт через MCP",
            result_payload,
        )
        return {"result": result_payload}

    async def list_tools(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "crm.contacts.list",
                "description": "List CRM contacts for the authenticated user.",
                "inputSchema": {
                    "type": "object",
                    "properties": {"page": {"type": "integer"}, "per_page": {"type": "integer"}},
                },
            },
            {
                "name": "crm.contacts.create",
                "description": "Create a CRM contact and notify connected frontend clients.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "first_name": {"type": "string"},
                        "last_name": {"type": "string"},
                        "phone": {"type": "string"},
                        "email": {"type": "string"},
                    },
                },
            },
            {
                "name": "crm.deals.list",
                "description": "List CRM deals for the authenticated user.",
                "inputSchema": {
                    "type": "object",
                    "properties": {"page": {"type": "integer"}, "per_page": {"type": "integer"}},
                },
            },
            {
                "name": "crm.deals.create",
                "description": "Create a CRM deal and notify connected frontend clients.",
                "inputSchema": {
                    "type": "object",
                    "required": ["contact_id", "title"],
                    "properties": {
                        "contact_id": {"type": "integer"},
                        "title": {"type": "string"},
                        "amount": {"type": "number"},
                    },
                },
            },
            {
                "name": "crm.search",
                "description": "Search contacts and deals.",
                "inputSchema": {
                    "type": "object",
                    "required": ["query"],
                    "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
                },
            },
            {
                "name": "crm.dashboard",
                "description": "Read CRM dashboard metrics.",
                "inputSchema": {"type": "object", "properties": {}},
            },
        ]

    async def call_tool(
        self,
        principal: McpPrincipal,
        name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        crm = CrmService(self.db, self.notifications)
        match name:
            case "crm.contacts.list":
                data = await crm.list_contacts(
                    principal.user_id,
                    page=int(arguments.get("page", 1)),
                    per_page=int(arguments.get("per_page", 50)),
                )
            case "crm.contacts.create":
                contact_payload = dict(arguments)
                if "phone" in contact_payload:
                    contact_payload.setdefault("phones", [contact_payload.pop("phone")])
                if "email" in contact_payload:
                    contact_payload.setdefault("emails", [contact_payload.pop("email")])
                data = await crm.create_contact(
                    principal.user_id, ContactCreateRequest(**contact_payload)
                )
            case "crm.deals.list":
                data = await crm.list_deals(
                    principal.user_id,
                    page=int(arguments.get("page", 1)),
                    per_page=int(arguments.get("per_page", 50)),
                )
            case "crm.deals.create":
                data = await crm.create_deal(principal.user_id, DealCreateRequest(**arguments))
            case "crm.search":
                query = str(arguments.get("query", "")).strip()
                if not query:
                    raise BadRequestError("Tool argument 'query' is required")
                data = await crm.search_all(
                    principal.user_id,
                    query=query,
                    limit=int(arguments.get("limit", 20)),
                )
            case "crm.dashboard":
                data = await crm.dashboard(principal.user_id)
            case _:
                raise BadRequestError(f"Unknown MCP tool: {name}")
        return {"content": [{"type": "json", "json": to_jsonable(data)}]}

    async def _publish(
        self,
        user_id: int,
        event_type: str,
        title: str,
        message: str,
        payload: dict[str, Any],
    ) -> None:
        if self.notifications is None:
            return
        await self.notifications.publish(
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            payload=payload,
        )
