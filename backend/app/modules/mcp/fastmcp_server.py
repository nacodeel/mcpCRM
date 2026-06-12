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


current_mcp_principal: contextvars.ContextVar[McpPrincipal | None] = contextvars.ContextVar(
    "current_mcp_principal",
    default=None,
)

mcp = FastMCP(
    "mcpCRM",
    stateless_http=True,
    json_response=True,
)

_mcp_db: Any | None = None
_mcp_notifications: Any | None = None


def configure_mcp_runtime(db: Any | None, notifications: Any | None = None) -> None:
    global _mcp_db, _mcp_notifications
    _mcp_db = db
    _mcp_notifications = notifications


def extract_bearer_token(ctx: Context) -> str | None:
    request = ctx.request_context.request if (ctx and ctx.request_context) else None
    if not request:
        return None

    auth = request.headers.get("authorization")
    if not auth:
        return None

    prefix = "Bearer "
    if auth.startswith(prefix):
        return auth[len(prefix):].strip()

    return auth.strip()


def get_db_and_hub(ctx: Context) -> tuple[Any, Any]:
    if _mcp_db is not None:
        return _mcp_db, _mcp_notifications

    request = ctx.request_context.request if (ctx and ctx.request_context) else None
    if request and hasattr(request, "app") and request.app:
        db = getattr(request.app.state, "db", None)
        notifications = getattr(request.app.state, "notifications", None)
        if db:
            return db, notifications

    from app.core.config import get_settings
    from app.integrations.database import build_database_manager

    settings = get_settings()
    db = build_database_manager(settings)
    return db, None


async def check_auth(required_scope: str, ctx: Context) -> McpPrincipal:
    raw_key = (
        extract_bearer_token(ctx)
        or os.environ.get("MCP_API_KEY")
        or os.environ.get("MCP_KEY")
    )

    if not raw_key:
        raise ValueError(
            "Not authenticated. Send Authorization: Bearer <MCP_KEY> "
            "or set MCP_API_KEY/MCP_KEY."
        )

    db, notifications = get_db_and_hub(ctx)
    service = McpService(db, notifications)

    try:
        principal = await service.authenticate(raw_key)
    except Exception as exc:
        raise ValueError(f"Failed to authenticate MCP key: {exc}") from exc

    require_scope(principal.scopes, required_scope)
    current_mcp_principal.set(principal)
    return principal


@mcp.tool()
async def crm_contacts_list(
    ctx: Context,
    page: int = 1,
    per_page: int = 50,
) -> dict[str, Any]:
    """List CRM contacts for the authenticated user."""
    principal = await check_auth("read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.list_contacts(principal.user_id, page=page, per_page=per_page)
    return {"contacts": to_jsonable(data)}


@mcp.tool()
async def crm_contacts_create(
    ctx: Context,
    first_name: str | None = None,
    last_name: str | None = None,
    middle_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    phones: list[str] | None = None,
    emails: list[str] | None = None,
    addresses: list[str] | None = None,
    tags: list[str] | None = None,
    note: str | None = None,
    source: str | None = "mcp",
    status: str | None = None,
) -> dict[str, Any]:
    """Create a CRM contact with phones, emails, addresses, tags and notes."""
    principal = await check_auth("create", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    resolved_phones = list(phones or [])
    if phone and phone not in resolved_phones:
        resolved_phones.append(phone)

    resolved_emails = list(emails or [])
    if email and email not in resolved_emails:
        resolved_emails.append(email)

    payload = ContactCreateRequest(
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        phones=resolved_phones,
        emails=resolved_emails,
        addresses=addresses or [],
        tags=tags or [],
        note=note,
        source=source,
        status=status,
    )
    data = await crm.create_contact(principal.user_id, payload)
    return {"contact": to_jsonable(data)}


@mcp.tool()
async def crm_contacts_update(
    ctx: Context,
    contact_id: int,
    first_name: str | None = None,
    last_name: str | None = None,
    middle_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    phones: list[str] | None = None,
    emails: list[str] | None = None,
    addresses: list[str] | None = None,
    tags: list[str] | None = None,
    note: str | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    """Update an existing CRM contact including their phones, emails, addresses, tags and notes."""
    principal = await check_auth("update", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    resolved_phones = list(phones) if phones is not None else None
    if phone:
        if resolved_phones is None:
            resolved_phones = []
        if phone not in resolved_phones:
            resolved_phones.append(phone)

    resolved_emails = list(emails) if emails is not None else None
    if email:
        if resolved_emails is None:
            resolved_emails = []
        if email not in resolved_emails:
            resolved_emails.append(email)

    payload = ContactUpdateRequest(
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        phones=resolved_phones,
        emails=resolved_emails,
        addresses=addresses,
        tags=tags,
        note=note,
        status=status,
    )
    data = await crm.update_contact(principal.user_id, contact_id, payload)
    return {"contact": to_jsonable(data)}


@mcp.tool()
async def crm_batch_create_contacts(
    ctx: Context,
    contacts: list[dict[str, Any]],
) -> dict[str, Any]:
    """Create multiple CRM contacts in a single batch operation."""
    principal = await check_auth("create", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    created_contacts = []
    for item in contacts:
        payload = ContactCreateRequest(
            first_name=item.get("first_name"),
            last_name=item.get("last_name"),
            middle_name=item.get("middle_name"),
            phones=item.get("phones") or ([item.get("phone")] if item.get("phone") else []),
            emails=item.get("emails") or ([item.get("email")] if item.get("email") else []),
            addresses=item.get("addresses") or [],
            tags=item.get("tags") or [],
            note=item.get("note"),
            source=item.get("source", "mcp_batch"),
            status=item.get("status"),
        )
        contact_data = await crm.create_contact(principal.user_id, payload)
        created_contacts.append(to_jsonable(contact_data))

    return {"contacts": created_contacts, "count": len(created_contacts)}


@mcp.tool()
async def crm_create_contact_with_deal(
    ctx: Context,
    first_name: str | None = None,
    last_name: str | None = None,
    middle_name: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    phones: list[str] | None = None,
    emails: list[str] | None = None,
    addresses: list[str] | None = None,
    tags: list[str] | None = None,
    note: str | None = None,
    deal_title: str = "Новая сделка",
    deal_amount: float | None = None,
    deal_description: str | None = None,
) -> dict[str, Any]:
    """Create a contact and immediately create and link a deal to them in one turn."""
    principal = await check_auth("create", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)

    resolved_phones = list(phones or [])
    if phone and phone not in resolved_phones:
        resolved_phones.append(phone)

    resolved_emails = list(emails or [])
    if email and email not in resolved_emails:
        resolved_emails.append(email)

    contact_payload = ContactCreateRequest(
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        phones=resolved_phones,
        emails=resolved_emails,
        addresses=addresses or [],
        tags=tags or [],
        note=note,
        source="mcp_with_deal",
    )
    contact = await crm.create_contact(principal.user_id, contact_payload)
    
    deal_payload = DealCreateRequest(
        contact_id=contact.id,
        title=deal_title,
        amount=Decimal(str(deal_amount)) if deal_amount is not None else None,
        description=deal_description,
    )
    deal = await crm.create_deal(principal.user_id, deal_payload)

    return {
        "contact": to_jsonable(contact),
        "deal": to_jsonable(deal)
    }


@mcp.tool()
async def crm_contacts_delete(
    ctx: Context,
    contact_id: int,
) -> dict[str, Any]:
    """Delete a CRM contact."""
    principal = await check_auth("delete", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    await crm.delete_contact(principal.user_id, contact_id)
    return {"success": True, "message": f"Contact {contact_id} deleted successfully"}


@mcp.tool()
async def crm_deals_list(
    ctx: Context,
    page: int = 1,
    per_page: int = 50,
) -> dict[str, Any]:
    """List CRM deals for the authenticated user."""
    principal = await check_auth("read", ctx)
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
    principal = await check_auth("create", ctx)
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
    principal = await check_auth("update", ctx)
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
async def crm_deals_delete(
    ctx: Context,
    deal_id: int,
) -> dict[str, Any]:
    """Delete a CRM deal."""
    principal = await check_auth("delete", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    await crm.delete_deal(principal.user_id, deal_id)
    return {"success": True, "message": f"Deal {deal_id} deleted successfully"}


@mcp.tool()
async def crm_search(
    ctx: Context,
    query: str,
    limit: int = 20,
) -> dict[str, Any]:
    """Search CRM contacts and deals."""
    principal = await check_auth("read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.search_all(principal.user_id, query=query, limit=limit)
    return {"results": to_jsonable(data)}


@mcp.tool()
async def crm_dashboard(ctx: Context) -> dict[str, Any]:
    """Read CRM dashboard metrics."""
    principal = await check_auth("read", ctx)
    db, hub = get_db_and_hub(ctx)
    crm = CrmService(db, hub)
    data = await crm.dashboard(principal.user_id)
    return {"dashboard": to_jsonable(data)}


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="0.0.0.0",
        port=8000,
    )