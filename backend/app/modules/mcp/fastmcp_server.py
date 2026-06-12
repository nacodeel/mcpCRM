import os
import contextvars
from decimal import Decimal
from typing import Any

from mcp.server.fastmcp import Context, FastMCP

from app.core.permissions import require_scope
from app.core.serialization import to_jsonable
from app.modules.crm.schemas import (
    ContactCreateRequest,
    ContactUpdateRequest,
    DealCreateRequest,
    DealUpdateRequest,
)
from app.modules.crm.service import CrmService
from app.modules.mcp.schemas import McpPrincipal
from app.modules.mcp.service import McpService

# Define current principal contextvar
current_mcp_principal: contextvars.ContextVar[McpPrincipal | None] = contextvars.ContextVar(
    "current_mcp_principal", default=None
)

mcp = FastMCP("mcpCRM")


def get_db_and_hub(ctx: Context) -> tuple[Any, Any]:
    request = ctx.request_context.request if (ctx and ctx.request_context) else None
    if request and hasattr(request, "app") and request.app:
        db = getattr(request.app.state, "db", None)
        notifications = getattr(request.app.state, "notifications", None)
        if db:
            return db, notifications

    # Fallback for Stdio/CLI context
    from app.core.config import get_settings
    from app.integrations.database import build_database_manager

    settings = get_settings()
    
    # Standard fallback DB connection for CLI running outside of Docker (use localhost if db is not reachable/running outside container network)
    # FastMCP client connects via stdio, where db service hostname 'db' is not resolvable.
    # We replace 'db:5432' with 'localhost:5432' if database connection fails or if we are outside docker.
    db_url = settings.DATABASE_URL
    if "db:5432" in db_url and not os.path.exists("/.dockerenv"):
        db_url = db_url.replace("db:5432", "localhost:5432")
    
    settings.DATABASE_URL = db_url
    db = build_database_manager(settings)
    return db, None


async def check_auth(required_scope: str, ctx: Context) -> McpPrincipal:
    principal = current_mcp_principal.get()
    if principal is None:
        env_key = os.environ.get("MCP_API_KEY") or os.environ.get("MCP_KEY")
        if env_key:
            db, notifications = get_db_and_hub(ctx)
            service = McpService(db, notifications)
            try:
                principal = await service.authenticate(env_key)
                current_mcp_principal.set(principal)
            except Exception as e:
                raise ValueError(f"Failed to authenticate key from environment: {e}")

    if principal is None:
        raise ValueError("Not authenticated. Please specify a valid MCP key via MCP_API_KEY or MCP_KEY.")
    require_scope(principal.scopes, required_scope)
    return principal


@mcp.tool()
async def crm_contacts_list(ctx: Context, page: int = 1, per_page: int = 50) -> dict[str, Any]:
    """List CRM contacts for the authenticated user."""
    principal = await check_auth("contacts:read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.list_contacts(principal.user_id, page=page, per_page=per_page)
    return {"contacts": to_jsonable(data)}


@mcp.tool()
async def crm_contacts_create(
    ctx: Context,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
) -> dict[str, Any]:
    """Create a CRM contact and notify connected frontend clients."""
    principal = await check_auth("contacts:write", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    phones = [phone] if phone else []
    emails = [email] if email else []

    payload = ContactCreateRequest(
        first_name=first_name,
        last_name=last_name,
        phones=phones,
        emails=emails,
    )
    data = await crm.create_contact(principal.user_id, payload)
    return {"contact": to_jsonable(data)}


@mcp.tool()
async def crm_contacts_update(
    ctx: Context,
    contact_id: int,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
) -> dict[str, Any]:
    """Update an existing CRM contact."""
    principal = await check_auth("contacts:write", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    payload = ContactUpdateRequest(
        first_name=first_name,
        last_name=last_name,
        phones=[phone] if phone is not None else None,
        emails=[email] if email is not None else None,
    )
    data = await crm.update_contact(principal.user_id, contact_id, payload)
    return {"contact": to_jsonable(data)}


@mcp.tool()
async def crm_contacts_delete(ctx: Context, contact_id: int) -> dict[str, Any]:
    """Delete a CRM contact."""
    principal = await check_auth("contacts:delete", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    await crm.delete_contact(principal.user_id, contact_id)
    return {"success": True, "message": f"Contact {contact_id} deleted successfully"}


@mcp.tool()
async def crm_deals_list(ctx: Context, page: int = 1, per_page: int = 50) -> dict[str, Any]:
    """List CRM deals for the authenticated user."""
    principal = await check_auth("contacts:read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.list_deals(principal.user_id, page=page, per_page=per_page)
    return {"deals": to_jsonable(data)}


@mcp.tool()
async def crm_deals_create(
    ctx: Context,
    contact_id: int,
    title: str,
    amount: float | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    """Create a CRM deal and notify connected frontend clients."""
    principal = await check_auth("contacts:write", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    payload = DealCreateRequest(
        contact_id=contact_id,
        title=title,
        amount=Decimal(str(amount)) if amount is not None else None,
        description=description,
    )
    data = await crm.create_deal(principal.user_id, payload)
    return {"deal": to_jsonable(data)}


@mcp.tool()
async def crm_deals_update(
    ctx: Context,
    deal_id: int,
    contact_id: int | None = None,
    title: str | None = None,
    amount: float | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    """Update an existing CRM deal."""
    principal = await check_auth("contacts:write", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    payload = DealUpdateRequest(
        contact_id=contact_id,
        title=title,
        amount=Decimal(str(amount)) if amount is not None else None,
        status=status,
    )
    data = await crm.update_deal(principal.user_id, deal_id, payload)
    return {"deal": to_jsonable(data)}


@mcp.tool()
async def crm_deals_delete(ctx: Context, deal_id: int) -> dict[str, Any]:
    """Delete a CRM deal."""
    principal = await check_auth("deals:delete", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    await crm.delete_deal(principal.user_id, deal_id)
    return {"success": True, "message": f"Deal {deal_id} deleted successfully"}


@mcp.tool()
async def crm_search(ctx: Context, query: str, limit: int = 20) -> dict[str, Any]:
    """Search CRM contacts and deals."""
    principal = await check_auth("contacts:read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.search_all(principal.user_id, query=query, limit=limit)
    return {"results": to_jsonable(data)}


@mcp.tool()
async def crm_dashboard(ctx: Context) -> dict[str, Any]:
    """Read CRM dashboard metrics."""
    principal = await check_auth("contacts:read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.dashboard(principal.user_id)
    return {"dashboard": to_jsonable(data)}


if __name__ == "__main__":
    mcp.run()
