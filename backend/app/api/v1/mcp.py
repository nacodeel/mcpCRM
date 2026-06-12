from typing import Any

from fastapi import APIRouter, status

from app.api.deps import McpPrincipalDep, McpServiceDep
from app.core.permissions import require_scope
from app.core.serialization import success_payload
from app.modules.mcp.schemas import (
    McpIngestContactRequest,
    McpJsonRpcRequest,
    McpPrincipalRead,
    McpToolCallRequest,
)

router = APIRouter()


@router.get("/me", response_model=McpPrincipalRead)
async def mcp_me(principal: McpPrincipalDep) -> McpPrincipalRead:
    return McpPrincipalRead.model_validate(principal)


@router.post("/ingest-contact", status_code=status.HTTP_201_CREATED)
async def ingest_contact(
    payload: McpIngestContactRequest,
    principal: McpPrincipalDep,
    service: McpServiceDep,
) -> dict[str, Any]:
    require_scope(principal.scopes, "contacts:write")
    return success_payload(await service.ingest_contact(principal, payload))


@router.get("/tools")
async def list_tools(
    principal: McpPrincipalDep,
    service: McpServiceDep,
) -> dict[str, Any]:
    require_scope(principal.scopes, "contacts:read")
    return success_payload(await service.list_tools())


@router.post("/tools/call")
async def call_tool(
    payload: McpToolCallRequest,
    principal: McpPrincipalDep,
    service: McpServiceDep,
) -> dict[str, Any]:
    write_tools = {"crm.contacts.create", "crm.deals.create"}
    scope = "contacts:write" if payload.name in write_tools else "contacts:read"
    require_scope(principal.scopes, scope)
    return success_payload(await service.call_tool(principal, payload.name, payload.arguments))


@router.post("/rpc")
async def json_rpc(
    payload: McpJsonRpcRequest,
    principal: McpPrincipalDep,
    service: McpServiceDep,
) -> dict[str, Any]:
    try:
        match payload.method:
            case "initialize":
                result = {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {"name": "mcpCRM", "version": "1.0.0"},
                    "capabilities": {"tools": {}},
                }
            case "tools/list":
                require_scope(principal.scopes, "contacts:read")
                result = {"tools": await service.list_tools()}
            case "tools/call":
                tool_name = str(payload.params.get("name", ""))
                arguments = dict(payload.params.get("arguments") or {})
                write_tools = {"crm.contacts.create", "crm.deals.create"}
                scope = "contacts:write" if tool_name in write_tools else "contacts:read"
                require_scope(principal.scopes, scope)
                result = await service.call_tool(principal, tool_name, arguments)
            case _:
                return {
                    "jsonrpc": "2.0",
                    "id": payload.id,
                    "error": {"code": -32601, "message": f"Method not found: {payload.method}"},
                }
    except Exception as exc:
        return {
            "jsonrpc": "2.0",
            "id": payload.id,
            "error": {"code": -32000, "message": str(exc)},
        }
    return {"jsonrpc": "2.0", "id": payload.id, "result": result}
