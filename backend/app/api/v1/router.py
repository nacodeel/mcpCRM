from fastapi import APIRouter

from app.api.v1 import admin, auth, health, notifications, users, mcp_keys
from app.api.v1.crm import contacts, dashboard, deals, search

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(mcp_keys.router, prefix="/mcp_keys", tags=["mcp_keys"])

router.include_router(contacts.router, prefix="/crm/contacts", tags=["crm:contacts"])
router.include_router(deals.router, prefix="/crm/deals", tags=["crm:deals"])
router.include_router(dashboard.router, prefix="/crm/dashboard", tags=["crm:dashboard"])
router.include_router(search.router, prefix="/crm/search", tags=["crm:search"])
