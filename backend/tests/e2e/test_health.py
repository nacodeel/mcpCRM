import pytest


@pytest.mark.asyncio
async def test_live_health(client) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
