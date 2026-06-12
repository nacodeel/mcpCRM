from typing import Any

from app.core.exceptions import NotFoundError, UnauthorizedError
from app.core.security import hash_password
from app.integrations.database import DatabaseSessionManagerProtocol
from app.modules.users.schemas import BootstrapAdminRequest


class UserService:
    def __init__(self, db: DatabaseSessionManagerProtocol):
        self.db = db

    async def get_active_user_by_id(self, user_id: int | str) -> Any:
        async with self.db.crud() as crud:
            users = getattr(crud, "users", getattr(crud, "user", None))
            if users is None:
                raise RuntimeError("database CRUD must expose users repository")
            user = await users.get(user_id)
        if user is None:
            raise UnauthorizedError("User not found")
        if not bool(getattr(user, "is_active", True)):
            raise UnauthorizedError("User is inactive")
        return user

    async def bootstrap_admin(self, payload: BootstrapAdminRequest) -> Any:
        async with self.db.transactional_crud() as crud:
            users = getattr(crud, "users", getattr(crud, "user", None))
            if users is None:
                raise RuntimeError("database CRUD must expose users repository")

            existing = None
            if hasattr(users, "get_by_username"):
                existing = await users.get_by_username(payload.username)
            if existing is not None:
                return existing

            role_value: Any = "ADMIN"
            try:
                from database.enums import UserRole

                role_value = UserRole.ADMIN
            except Exception:
                role_value = "ADMIN"

            create_data = {
                "username": payload.username,
                "name": payload.name,
                "password_hash": hash_password(payload.password),
                "role": role_value,
                "is_active": True,
            }
            try:
                return await users.create(**create_data)
            except TypeError:
                # Compatibility for generated CRUD that accepts dict.
                return await users.create(create_data)

    async def require_user_exists(self, user_id: int | str) -> Any:
        async with self.db.crud() as crud:
            users = getattr(crud, "users", getattr(crud, "user", None))
            user = await users.get(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user
