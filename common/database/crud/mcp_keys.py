from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from ..base import BaseCRUD
from ..models.crm import McpKey
from ..utils import generate_mcp_key, hash_key


class McpKeyCRUD(BaseCRUD[McpKey]):
    def __init__(self, session):
        super().__init__(session, McpKey)

    async def by_user(
        self,
        user_id: int,
        *,
        active_only: bool = False,
        limit: int | None = None,
    ) -> list[McpKey]:
        filters = [McpKey.user_id == user_id]
        if active_only:
            filters.append(McpKey.is_active.is_(True))
        return await self.list(*filters, order_by=("-created_at", "-id"), limit=limit)

    async def page_by_user(self, user_id: int, *, page: int = 1, per_page: int = 50):
        return await self.page(McpKey.user_id == user_id, order_by=("-created_at", "-id"), page=page, per_page=per_page)

    async def get_by_hash(self, key_hash: str) -> McpKey | None:
        return await self.get_one(McpKey.key_hash == key_hash, options=[selectinload(McpKey.user)])

    async def get_by_raw_key(self, raw_key: str) -> McpKey | None:
        return await self.get_by_hash(hash_key(raw_key))

    async def get_active_by_hash(self, key_hash: str) -> McpKey | None:
        return await self.get_one(
            McpKey.key_hash == key_hash,
            McpKey.is_active.is_(True),
            options=[selectinload(McpKey.user)],
        )

    async def valid_by_hash(self, key_hash: str, *, now: datetime | None = None) -> McpKey | None:
        current_time = now or datetime.now(timezone.utc)
        return await self.get_one(
            McpKey.key_hash == key_hash,
            McpKey.is_active.is_(True),
            or_(McpKey.expires_at.is_(None), McpKey.expires_at > current_time),
            options=[selectinload(McpKey.user)],
        )

    async def valid_by_raw_key(self, raw_key: str, *, now: datetime | None = None) -> McpKey | None:
        return await self.valid_by_hash(hash_key(raw_key), now=now)

    async def touch_used(self, key_id: int, *, used_at: datetime | None = None) -> McpKey:
        return await self.update_by_id(key_id, last_used_at=used_at or datetime.now(timezone.utc))

    async def revoke(self, key_id: int) -> McpKey:
        return await self.update_by_id(key_id, is_active=False)

    async def create_key(
        self,
        *,
        user_id: int,
        name: str,
        raw_key: str | None = None,
        scopes: Sequence[str] | None = None,
        expires_at: datetime | None = None,
    ) -> tuple[McpKey, str]:
        resolved_raw_key = raw_key or generate_mcp_key()
        obj = await self.create(
            user_id=user_id,
            name=name,
            key_hash=hash_key(resolved_raw_key),
            scopes=list(scopes or []),
            expires_at=expires_at,
            is_active=True,
        )
        return obj, resolved_raw_key

    async def rotate(
        self,
        key_id: int,
        *,
        raw_key: str | None = None,
        name: str | None = None,
        scopes: Sequence[str] | None = None,
        expires_at: datetime | None = None,
    ) -> tuple[McpKey, str]:
        old_key = await self.require(key_id)
        await self.revoke(old_key.id)
        return await self.create_key(
            user_id=old_key.user_id,
            name=name or old_key.name,
            raw_key=raw_key,
            scopes=list(scopes if scopes is not None else old_key.scopes),
            expires_at=expires_at if expires_at is not None else old_key.expires_at,
        )
