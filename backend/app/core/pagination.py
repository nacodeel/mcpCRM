from typing import Annotated, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

T = TypeVar("T")

PageQuery = Annotated[int, Query(ge=1, description="Page number, starts with 1")]
PerPageQuery = Annotated[int, Query(ge=1, le=200, description="Items per page")]


class PageMeta(BaseModel):
    page: int = Field(ge=1)
    per_page: int = Field(ge=1)
    total: int = Field(ge=0)
    pages: int = Field(ge=0)
    has_next: bool
    has_prev: bool


class PageResponse(BaseModel, Generic[T]):
    items: list[T]
    meta: PageMeta


def build_page_meta(*, page: int, per_page: int, total: int) -> PageMeta:
    pages = (total + per_page - 1) // per_page if total else 0
    return PageMeta(
        page=page,
        per_page=per_page,
        total=total,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1,
    )
