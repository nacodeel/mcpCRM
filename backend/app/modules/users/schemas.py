from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str | None = None
    name: str | None = None
    role: str | None = None
    role_ru: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_db(cls, user: Any) -> "UserRead":
        role = getattr(user, "role", None)
        role_value = getattr(role, "value", role)
        role_ru = getattr(role, "ru", None) or getattr(user, "role_ru", None)
        return cls(
            id=getattr(user, "id"),
            username=getattr(user, "username", None) or getattr(user, "email", None),
            name=getattr(user, "name", None) or getattr(user, "full_name", None),
            role=role_value,
            role_ru=role_ru,
            is_active=bool(getattr(user, "is_active", True)),
            created_at=getattr(user, "created_at", None),
            updated_at=getattr(user, "updated_at", None),
        )


class BootstrapAdminRequest(BaseModel):
    username: str = Field(min_length=3, max_length=120)
    name: str = Field(min_length=1, max_length=240)
    password: str = Field(min_length=8, max_length=512)
