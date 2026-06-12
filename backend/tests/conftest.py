import pytest
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager

from app.factory import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    async with LifespanManager(app) as manager:
        async with AsyncClient(transport=ASGITransport(app=manager.app), base_url="http://localhost:8000") as ac:
            yield ac



