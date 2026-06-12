from typing import Any

from fastapi import APIRouter

from app.api.deps import McpPrincipalDep, McpServiceDep
from app.core.permissions import require_scope
from app.modules.mcp.schemas import McpIngestContactRequest, McpPrincipalRead

router = APIRouter()


@router.get("/me", response_model=McpPrincipalRead)
async def mcp_me(principal: McpPrincipalDep) -> McpPrincipalRead:
    return McpPrincipalRead.model_validate(principal)


@router.post("/ingest-contact")
async def ingest_contact(
    payload: McpIngestContactRequest,
    principal: McpPrincipalDep,
    service: McpServiceDep,
) -> dict[str, Any]:
    require_scope(principal.scopes, "contacts:write")
    return await service.ingest_contact(principal, payload)
