from typing import Any

from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.integrations.database import DatabaseSessionManagerProtocol
from app.modules.auth.schemas import TokenResponse


class AuthService:
    def __init__(self, db: DatabaseSessionManagerProtocol):
        self.db = db

    async def login(self, *, username: str, password: str) -> TokenResponse:
        async with self.db.crud() as crud:
            users = getattr(crud, "users", getattr(crud, "user", None))
            if users is None or not hasattr(users, "get_by_username"):
                raise RuntimeError("database CRUD must expose users.get_by_username")
            user = await users.get_by_username(username)

        if user is None:
            raise UnauthorizedError("Invalid username or password")
        if not bool(getattr(user, "is_active", True)):
            raise UnauthorizedError("User is inactive")

        password_hash = getattr(user, "password_hash", None) or getattr(user, "hashed_password", None)
        if not verify_password(password, password_hash):
            raise UnauthorizedError("Invalid username or password")

        role = getattr(getattr(user, "role", None), "value", getattr(user, "role", None))
        token = create_access_token(
            subject=getattr(user, "id"),
            extra_claims={"username": getattr(user, "username", None), "role": role},
        )
        return TokenResponse(access_token=token)
