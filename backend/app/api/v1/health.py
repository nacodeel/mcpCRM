from fastapi import APIRouter

from app.api.deps import DbManagerDep
from app.observability.health import check_database

router = APIRouter()


@router.get("/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(manager: DbManagerDep) -> dict[str, object]:
    db = await check_database(manager)
    status = "ok" if db["ok"] else "error"
    return {"status": status, "checks": {"database": db}}
