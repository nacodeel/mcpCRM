from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from ..base import BaseCRUD
from ..enums import DealStatus
from ..models.crm import Deal


class DealCRUD(BaseCRUD[Deal]):
    def __init__(self, session):
        super().__init__(session, Deal)

    async def by_user(
        self,
        user_id: int,
        *,
        status: DealStatus | str | None = None,
        limit: int | None = None,
    ) -> list[Deal]:
        filters = [Deal.user_id == user_id]
        if status is not None:
            filters.append(Deal.status == status)
        return await self.list(*filters, order_by=("-created_at", "-id"), limit=limit)

    async def page_by_user(
        self,
        user_id: int,
        *,
        status: DealStatus | str | None = None,
        page: int = 1,
        per_page: int = 50,
    ):
        filters = [Deal.user_id == user_id]
        if status is not None:
            filters.append(Deal.status == status)
        return await self.page(*filters, order_by=("-created_at", "-id"), page=page, per_page=per_page)

    async def by_contact(
        self,
        contact_id: int,
        *,
        status: DealStatus | str | None = None,
        limit: int | None = None,
    ) -> list[Deal]:
        filters = [Deal.contact_id == contact_id]
        if status is not None:
            filters.append(Deal.status == status)
        return await self.list(*filters, order_by=("-created_at", "-id"), limit=limit)

    async def by_status(
        self,
        user_id: int,
        status: DealStatus | str,
        *,
        limit: int | None = None,
    ) -> list[Deal]:
        return await self.by_user(user_id, status=status, limit=limit)

    async def get_full(self, deal_id: int) -> Deal | None:
        return await self.get(
            deal_id,
            options=[
                selectinload(Deal.user),
                selectinload(Deal.contact),
            ],
        )

    async def search(self, user_id: int, query: str, *, limit: int = 50) -> list[Deal]:
        pattern = f"%{query.strip()}%"
        return await self.list(
            Deal.user_id == user_id,
            or_(
                Deal.title.ilike(pattern),
                Deal.description.ilike(pattern),
                Deal.comment.ilike(pattern),
            ),
            order_by=("-created_at", "-id"),
            limit=limit,
        )

    async def set_status(self, deal_id: int, status: DealStatus | str) -> Deal:
        return await self.update_by_id(deal_id, status=status)

    async def mark_won(self, deal_id: int, *, close_date: date | None = None) -> Deal:
        payload = {"status": DealStatus.WON}
        if close_date is not None:
            payload["close_date"] = close_date
        return await self.update_by_id(deal_id, **payload)

    async def mark_lost(self, deal_id: int, *, close_date: date | None = None) -> Deal:
        payload = {"status": DealStatus.LOST}
        if close_date is not None:
            payload["close_date"] = close_date
        return await self.update_by_id(deal_id, **payload)

    async def cancel(self, deal_id: int) -> Deal:
        return await self.update_by_id(deal_id, status=DealStatus.CANCELLED)

    async def create_for_contact(
        self,
        *,
        user_id: int,
        contact_id: int,
        title: str,
        description: str | None = None,
        amount: Decimal | float | str | None = None,
        currency: str = "RUB",
        comment: str | None = None,
        status: DealStatus | str = DealStatus.NEW,
        close_date: date | None = None,
    ) -> Deal:
        return await self.create(
            user_id=user_id,
            contact_id=contact_id,
            title=title,
            description=description,
            amount=amount,
            currency=currency,
            comment=comment,
            status=status,
            close_date=close_date,
        )
