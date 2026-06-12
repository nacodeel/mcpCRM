from fastapi import APIRouter

from app.api.deps import CurrentUserDep, DbManagerDep
from app.modules.mcp.schemas import McpKeyCreate, McpKeyCreatedResponse, McpKeyRead
from app.modules.mcp.service import McpService

router = APIRouter()


@router.get("", response_model=list[McpKeyRead])
async def list_mcp_keys(
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> list[McpKeyRead]:
    service = McpService(manager)
    return await service.list_keys(current_user.id)


@router.post("", response_model=McpKeyCreatedResponse)
async def create_mcp_key(
    payload: McpKeyCreate,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> McpKeyCreatedResponse:
    service = McpService(manager)
    key_obj, raw_token = await service.create_key(current_user.id, payload)
    return McpKeyCreatedResponse(
        key=McpKeyRead.model_validate(key_obj),
        raw_token=raw_token,
    )


@router.delete("/{key_id}", status_code=204)
async def revoke_mcp_key(
    key_id: int,
    current_user: CurrentUserDep,
    manager: DbManagerDep,
) -> None:
    service = McpService(manager)
    await service.revoke_key(current_user.id, key_id)
