from typing import Any

from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class DataResponse(BaseModel):
    data: Any
