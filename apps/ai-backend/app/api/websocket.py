"""WebSocket gateway for real-time agent progress updates."""

from __future__ import annotations

import json
from typing import Any

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = structlog.get_logger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per project."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info("ws_connected", project_id=project_id)

    def disconnect(self, project_id: str, websocket: WebSocket) -> None:
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        logger.info("ws_disconnected", project_id=project_id)

    async def broadcast(self, project_id: str, message: dict[str, Any]) -> None:
        """Send a message to all connections for a project."""
        if project_id not in self.active_connections:
            return

        dead_connections = []
        for connection in self.active_connections[project_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for conn in dead_connections:
            self.disconnect(project_id, conn)


manager = ConnectionManager()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str) -> None:
    """WebSocket endpoint for real-time agent progress updates."""
    await manager.connect(project_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
    except Exception as e:
        logger.error("ws_error", project_id=project_id, error=str(e))
        manager.disconnect(project_id, websocket)


async def emit_agent_progress(
    project_id: str,
    agent_name: str,
    status: str,
    progress_percent: int,
    message: str,
    confidence_score: float | None = None,
    output_preview: dict[str, Any] | None = None,
) -> None:
    """Emit an agent progress event to all connected clients."""
    from datetime import datetime, timezone

    await manager.broadcast(project_id, {
        "type": "agent_progress",
        "project_id": project_id,
        "agent_name": agent_name,
        "status": status,
        "progress_percent": progress_percent,
        "message": message,
        "confidence_score": confidence_score,
        "output_preview": output_preview,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
