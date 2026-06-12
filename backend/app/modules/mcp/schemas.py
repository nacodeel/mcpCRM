from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class McpKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scopes: list[str] = Field(default_factory=list)
    expires_at: datetime | None = None

class McpKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    scopes: list[str]
    is_active: bool
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime

class McpKeyCreatedResponse(BaseModel):
    key: McpKeyRead
    raw_token: str


@dataclass(frozen=True)
class McpPrincipal:
    user_id: int
    key_id: int
    scopes: list[str]
    name: str | None = None


class McpPrincipalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    key_id: int
    scopes: list[str]
    name: str | None = None


class McpIngestContactRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    phone: str | None = None
    email: str | None = None
    source: str | None = "mcp"
    tags: list[str] = Field(default_factory=list)
    note: str | None = None
    deal: dict[str, Any] | None = None


class McpJsonRpcRequest(BaseModel):
    jsonrpc: str = Field(default="2.0")
    id: str | int | None = None
    method: str
    params: dict[str, Any] = Field(default_factory=dict)


class McpToolCallRequest(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)
