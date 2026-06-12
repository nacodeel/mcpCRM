from typing import Any

from app.core.exceptions import UnauthorizedError
from app.integrations.database import DatabaseSessionManagerProtocol
from app.modules.mcp.schemas import McpIngestContactRequest, McpPrincipal


class McpService:
    def __init__(self, db: DatabaseSessionManagerProtocol):
        self.db = db

    async def authenticate(self, raw_key: str) -> McpPrincipal:
        async with self.db.transactional_crud() as crud:
            keys = getattr(crud, "mcp_keys", getattr(crud, "mcp_key", None))
            if keys is None:
                raise RuntimeError("database CRUD must expose mcp_keys repository")

            key_obj = None
            if hasattr(keys, "valid_by_raw_key"):
                key_obj = await keys.valid_by_raw_key(raw_key)
            elif hasattr(keys, "valid_by_hash"):
                try:
                    from database.utils import hash_key
                except Exception as exc:
                    raise RuntimeError(
                        "database.utils.hash_key is required when valid_by_raw_key is not available"
                    ) from exc
                key_obj = await keys.valid_by_hash(hash_key(raw_key))

            if key_obj is None:
                raise UnauthorizedError("Invalid MCP key")

            if hasattr(keys, "touch_used"):
                await keys.touch_used(getattr(key_obj, "id"))

            return McpPrincipal(
                user_id=getattr(key_obj, "user_id"),
                key_id=getattr(key_obj, "id"),
                scopes=list(getattr(key_obj, "scopes", []) or []),
                name=getattr(key_obj, "name", None),
            )

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
            return {"result": result}
