"""API service module for nakari Live2D frontend integration.

Provides FastAPI server with WebSocket support for real-time
communication between nakari and the Live2D web frontend.
"""

from __future__ import annotations

__all__ = ["WebSocketManager", "create_app", "run_api_server", "get_ws_manager"]

from nakari.api.app import create_app, get_ws_manager
from nakari.api.websocket import WebSocketManager
from nakari.api.server import run_api_server
