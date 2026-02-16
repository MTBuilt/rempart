"""WebSocket route for live nftables updates."""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .manager import ConnectionManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    """Live update endpoint.

    Clients connect here to receive real-time notifications
    when the nftables ruleset changes externally.
    """
    manager: ConnectionManager = ws.app.state.ws_manager
    await manager.connect(ws)
    logger.info("WebSocket client connected (%d total)", manager.count)
    try:
        # Keep the connection alive — wait for client disconnect
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)
        logger.info("WebSocket client disconnected (%d remaining)", manager.count)
