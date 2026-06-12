import pytest
from httpx import AsyncClient
from starlette.responses import Response
from starlette.routing import Mount, Route
from sqlalchemy import text as sa_text

@pytest.fixture(autouse=True)
async def cleanup_db(client, app):
    db = getattr(app.state, "db", None)
    if db:
        async with db.transactional_crud() as crud:
            await crud.session.execute(sa_text('TRUNCATE crm.deals, crm.contacts, crm.mcp_keys, crm.users CASCADE'))
    yield

@pytest.fixture(autouse=True)
def patch_mcp_sse(app):
    # Mock the /sse endpoint to return immediately in tests, avoiding client hang
    from starlette.routing import request_response
    async def mock_sse(request):
        return Response("ok", media_type="text/event-stream")

    for route in app.routes:
        if isinstance(route, Mount) and route.path == "/mcp":
            for sub_route in route.app.routes:
                if isinstance(sub_route, Route) and sub_route.path == "/sse":
                    sub_route.endpoint = mock_sse
                    sub_route.app = request_response(mock_sse)


@pytest.mark.asyncio
async def test_fastmcp_auth_and_tools(client, app) -> None:
    # 1. Test request without key
    response = await client.get("/mcp/sse")
    assert response.status_code == 401
    assert response.json() == {"error": "Unauthorized: MCP key is required"}

    # 2. Test request with invalid key
    response = await client.get("/mcp/sse?token=invalid-key-123")
    assert response.status_code == 401
    assert "Invalid MCP key" in response.json()["error"]

    # 3. Create a test user and an MCP key
    db = app.state.db
    async with db.transactional_crud() as crud:
        from database.enums import UserRole
        user = await crud.users.create(
            username="mcp_user",
            name="MCP User",
            role=UserRole.USER,
            is_active=True
        )
        key_obj, raw_key = await crud.mcp_keys.create_key(
            user_id=user.id,
            name="Test Key",
            scopes=["contacts:read"]
        )

    # 4. Test request with valid key via query parameter
    response = await client.get(f"/mcp/sse?token={raw_key}")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    # 5. Test request with valid key via Authorization header
    response = await client.get("/mcp/sse", headers={"Authorization": f"Bearer {raw_key}"})
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
