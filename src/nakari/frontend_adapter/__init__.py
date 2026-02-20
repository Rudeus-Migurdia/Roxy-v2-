"""Frontend adapter module for nakari Live2D integration.

This module provides the bridge between nakari's core systems and
the Live2D web frontend, following nakari's architecture principles:
- Mailbox-based event flow
- Explicit tool registration
- Full async pipeline
- Minimal abstraction
"""

from __future__ import annotations

__all__ = [
    "WebSocketInput",
    "WebSocketOutput",
    "MultiOutputHandler",
    "AudioStreamInterceptor",
    "AudioBroadcaster",
    "StateEmitter",
]

from nakari.frontend_adapter.input import WebSocketInput
from nakari.frontend_adapter.output import MultiOutputHandler, WebSocketOutput
from nakari.frontend_adapter.audio_interceptor import AudioBroadcaster, AudioStreamInterceptor
from nakari.frontend_adapter.state_emitter import StateEmitter
