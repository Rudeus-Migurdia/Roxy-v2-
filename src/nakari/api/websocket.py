"""WebSocket connection manager for nakari API.

Manages WebSocket client connections and message broadcasting,
following nakari's async architecture.
"""

from __future__ import annotations

import asyncio
from typing import Awaitable, Callable, Dict, Set

import structlog
from fastapi import WebSocket

_log = structlog.get_logger("websocket_manager")


class WebSocketManager:
    """WebSocket connection manager.

    Manages multiple WebSocket client connections, handles
    message broadcasting, and provides subscription-based
    message filtering.
    """

    def __init__(
        self,
        on_last_client_disconnect: Callable[[], Awaitable[None]] | None = None,
        on_client_connect: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        """Initialize the WebSocket manager.

        Args:
            on_last_client_disconnect: Optional callback invoked when the last client disconnects
            on_client_connect: Optional callback invoked when a new client connects
        """
        self._connections: Dict[str, WebSocket] = {}
        self._client_ids: Dict[WebSocket, str] = {}
        self._subscribers: Dict[str, Set[str]] = {}
        self._on_last_client_disconnect = on_last_client_disconnect
        self._on_client_connect = on_client_connect
        self._log = _log

    async def connect(self, client_id: str, ws: WebSocket) -> None:
        """Accept and register a new WebSocket connection.

        Args:
            client_id: Unique identifier for the client
            ws: The WebSocket connection
        """
        await ws.accept()
        self._connections[client_id] = ws
        self._client_ids[ws] = client_id

        # Send welcome message
        await ws.send_json(
            {
                "version": "1.0",
                "type": "connected",
                "timestamp": asyncio.get_event_loop().time(),
                "payload": {
                    "client_id": client_id,
                    "server_time": asyncio.get_event_loop().time(),
                },
            }
        )

        self._log.info("client_connected", client_id=client_id, total=len(self._connections))

        # Trigger callback if this is a new connection
        if self._on_client_connect:
            asyncio.create_task(self._on_client_connect())

    def disconnect(self, client_id: str) -> None:
        """Disconnect a client.

        Args:
            client_id: The client to disconnect
        """
        ws = self._connections.pop(client_id, None)
        if ws:
            self._client_ids.pop(ws, None)

        # Clean up subscriptions
        for topic, subscribers in self._subscribers.items():
            subscribers.discard(client_id)

        remaining = len(self._connections)
        self._log.info("client_disconnected", client_id=client_id, remaining=remaining)

        # Trigger callback if this was the last client
        if remaining == 0 and self._on_last_client_disconnect:
            self._log.info("last_client_disconnected", callback="on_last_client_disconnect")
            asyncio.create_task(self._on_last_client_disconnect())

    async def send(self, client_id: str, message: dict) -> bool:
        """Send a message to a specific client.

        Args:
            client_id: The target client ID
            message: The message to send (will be JSON serialized)

        Returns:
            True if sent successfully, False otherwise
        """
        ws = self._connections.get(client_id)
        if ws is None:
            return False

        try:
            await ws.send_json(message)
            return True
        except Exception as e:
            self._log.warning("send_failed", client_id=client_id, error=str(e))
            self.disconnect(client_id)
            return False

    async def broadcast(self, message: dict, topic: str | None = None) -> None:
        """Broadcast a message to clients.

        Args:
            message: The message to broadcast
            topic: Optional topic filter. If provided, only sends to
                   subscribers of that topic. Otherwise sends to all.
        """
        if topic:
            clients = self._subscribers.get(topic, set())
        else:
            clients = set(self._connections.keys())

        # Send to all target clients concurrently
        tasks = [self.send(client_id, message) for client_id in clients]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        self._log.debug("broadcast", topic=topic, clients=len(clients))

    def subscribe(self, client_id: str, topic: str) -> None:
        """Subscribe a client to a topic.

        Args:
            client_id: The client to subscribe
            topic: The topic to subscribe to
        """
        if topic not in self._subscribers:
            self._subscribers[topic] = set()
        self._subscribers[topic].add(client_id)
        self._log.debug("subscribed", client_id=client_id, topic=topic)

    def unsubscribe(self, client_id: str, topic: str) -> None:
        """Unsubscribe a client from a topic.

        Args:
            client_id: The client to unsubscribe
            topic: The topic to unsubscribe from
        """
        if topic in self._subscribers:
            self._subscribers[topic].discard(client_id)
            self._log.debug("unsubscribed", client_id=client_id, topic=topic)

    @property
    def connection_count(self) -> int:
        """Get the number of connected clients."""
        return len(self._connections)

    @property
    def connected_clients(self) -> Set[str]:
        """Get the set of connected client IDs."""
        return set(self._connections.keys())

    async def close_all(self) -> None:
        """Close all WebSocket connections."""
        for ws in list(self._client_ids.keys()):
            try:
                await ws.close()
            except Exception:
                pass

        self._connections.clear()
        self._client_ids.clear()
        self._subscribers.clear()

        self._log.info("all_connections_closed")
