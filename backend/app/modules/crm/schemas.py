from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class ContactCreateRequest(BaseModel):
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    middle_name: str | None = Field(default=None, max_length=120)
    birth_date: date | None = None
    source: str | None = Field(default=None, max_length=120)
    status: str | None = None
    phones: list[str] = Field(default_factory=list)
    emails: list[str] = Field(default_factory=list)
    addresses: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    note: str | None = None


class ContactUpdateRequest(BaseModel):
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    middle_name: str | None = Field(default=None, max_length=120)
    birth_date: date | None = None
    source: str | None = Field(default=None, max_length=120)
    status: str | None = None
    phones: list[str] | None = None
    emails: list[str] | None = None
    addresses: list[str] | None = None
    tags: list[str] | None = None
    note: str | None = None


class DealCreateRequest(BaseModel):
    contact_id: int
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    amount: Decimal | None = None
    currency: str = Field(default="RUB", max_length=10)
    comment: str | None = None
    status: str | None = None
    close_date: date | None = None


class RawDatabaseResponse(BaseModel):
    data: Any
