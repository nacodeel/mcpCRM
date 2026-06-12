from typing import Any

from sqlalchemy import text

from app.integrations.database import DatabaseSessionManagerProtocol


async def check_database(manager: DatabaseSessionManagerProtocol) -> dict[str, Any]:
    try:
        async with manager.session() as session:
            await session.execute(text("SELECT 1"))
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
