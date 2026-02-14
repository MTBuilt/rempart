"""WebSocket connection manager for live updates."""

from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.connections.remove(ws)

    async def broadcast(self, message_type: str, data: Any) -> None:
        """Broadcast a message to all connected clients."""
        payload = json.dumps({"type": message_type, "data": data})
        disconnected: list[WebSocket] = []
        for ws in self.connections:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.connections.remove(ws)

    @property
    def count(self) -> int:
        return len(self.connections)
