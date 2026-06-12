from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from ..base import BaseCRUD
from ..enums import UserRole
from ..models.crm import Contact, Deal, User


class UserCRUD(BaseCRUD[User]):
    def __init__(self, session):
        super().__init__(session, User)

    async def get_by_username(self, username: str) -> User | None:
        return await self.get_one(User.username == username)

    async def active(self, *, limit: int | None = None) -> list[User]:
        return await self.list(User.is_active.is_(True), order_by=("username", "id"), limit=limit)

    async def admins(self, *, active_only: bool = False) -> list[User]:
        filters = [User.role == UserRole.ADMIN]
        if active_only:
            filters.append(User.is_active.is_(True))
        return await self.list(*filters, order_by=("username", "id"))

    async def search(self, query: str, *, limit: int = 50) -> list[User]:
        pattern = f"%{query.strip()}%"
        return await self.list(
            or_(
                User.username.ilike(pattern),
                User.name.ilike(pattern),
            ),
            order_by=("username", "id"),
            limit=limit,
        )

    async def get_full(self, user_id: int) -> User | None:
        return await self.get(
            user_id,
            options=[
                selectinload(User.mcp_keys),
                selectinload(User.contacts).selectinload(Contact.phones),
                selectinload(User.contacts).selectinload(Contact.emails),
                selectinload(User.deals).selectinload(Deal.contact),
            ],
        )

    async def activate(self, user_id: int) -> User:
        return await self.update_by_id(user_id, is_active=True)

    async def deactivate(self, user_id: int) -> User:
        return await self.update_by_id(user_id, is_active=False)

    async def ensure_admin(
        self,
        *,
        username: str,
        name: str,
        password_hash: str | None = None,
    ) -> tuple[User, bool]:
        return await self.get_or_create(
            username=username,
            defaults={
                "name": name,
                "password_hash": password_hash,
                "role": UserRole.ADMIN,
                "is_active": True,
            },
        )
