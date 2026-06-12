from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import WebSocket

from app.core.serialization import to_jsonable


@dataclass(slots=True)
class NotificationEvent:
    type: str
    user_id: int
    title: str
    message: str
    payload: Mapping[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "payload": to_jsonable(self.payload),
            "created_at": self.created_at.isoformat(),
        }


class NotificationHub:
    """Process-local realtime notification bus for API and MCP writes."""

    def __init__(self, *, history_size: int = 200) -> None:
        self.history_size = history_size
        self._history: dict[int, deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=history_size)
        )
        self._subscribers: dict[int, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def publish(
        self,
        *,
        user_id: int,
        event_type: str,
        title: str,
        message: str,
        payload: Mapping[str, Any] | None = None,
    ) -> dict[str, Any]:
        event = NotificationEvent(
            user_id=user_id,
            type=event_type,
            title=title,
            message=message,
            payload=payload or {},
        ).as_dict()
        async with self._lock:
            self._history[user_id].append(event)
            subscribers = list(self._subscribers[user_id])
        for queue in subscribers:
            queue.put_nowait(event)
        return event

    async def history(self, user_id: int, *, limit: int = 50) -> list[dict[str, Any]]:
        async with self._lock:
            events = list(self._history[user_id])
        return events[-limit:]

    async def subscribe(self, user_id: int) -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[user_id].add(queue)
        try:
            yield queue
        finally:
            async with self._lock:
                self._subscribers[user_id].discard(queue)

    async def websocket_loop(self, websocket: WebSocket, *, user_id: int) -> None:
        await websocket.accept()
        await websocket.send_json({"type": "connected", "user_id": user_id})
        async for queue in self.subscribe(user_id):
            while True:
                event = await queue.get()
                await websocket.send_json({"type": "notification", "data": event})
