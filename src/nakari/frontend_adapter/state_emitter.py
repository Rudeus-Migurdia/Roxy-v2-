"""State event emitter for nakari → frontend communication.

Emits nakari's internal state changes to connected WebSocket clients,
allowing the frontend to synchronize Live2D animations and expressions.
"""

from __future__ import annotations

import time
from enum import Enum

import structlog


class NakariState(str, Enum):
    """nakari's possible states."""

    IDLE = "idle"
    THINKING = "thinking"
    SPEAKING = "speaking"
    PROCESSING = "processing"


class Live2DEmotion(str, Enum):
    """Live2D supported emotions."""

    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISED = "surprised"


class Live2DMotion(str, Enum):
    """Live2D supported motions."""

    IDLE = "idle"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    THINKING = "thinking"
    SURPRISED = "surprised"
    SPEAKING = "speaking"


_log = structlog.get_logger("state_emitter")


class StateEmitter:
    """Emits nakari state events to WebSocket clients.

    This class provides methods to broadcast state changes, allowing
    the Live2D frontend to synchronize animations, expressions, and
    other visual elements with nakari's internal state.
    """

    def __init__(self, ws_manager) -> None:
        """Initialize the state emitter.

        Args:
            ws_manager: WebSocketManager instance for broadcasting
        """
        self._manager = ws_manager
        self._current_state = NakariState.IDLE
        self._current_emotion = Live2DEmotion.NEUTRAL
        self._log = structlog.get_logger("state_emitter")

    async def emit_state(self, state: NakariState, event_id: str | None = None) -> None:
        """Emit a state change event.

        Args:
            state: The new state
            event_id: Optional associated event ID
        """
        self._current_state = state

        message = {
            "version": "1.0",
            "type": "state",
            "timestamp": time.time(),
            "payload": {
                "state": state.value,
                "event_id": event_id,
            },
        }

        await self._manager.broadcast(message)
        self._log.debug("state_emitted", state=state.value, event_id=event_id)

    async def emit_thinking(self, event_id: str | None = None) -> None:
        """Emit thinking state (LLM is processing)."""
        await self.emit_state(NakariState.THINKING, event_id)

    async def emit_speaking(self, event_id: str | None = None) -> None:
        """Emit speaking state (TTS is playing)."""
        await self.emit_state(NakariState.SPEAKING, event_id)

    async def emit_idle(self) -> None:
        """Emit idle state (waiting for input)."""
        await self.emit_state(NakariState.IDLE)

    async def emit_processing(self, event_id: str | None = None) -> None:
        """Emit processing state (tool execution in progress)."""
        await self.emit_state(NakariState.PROCESSING, event_id)

    async def emit_action(self, tool_name: str, event_id: str | None = None) -> None:
        """Emit a tool action event.

        Args:
            tool_name: Name of the tool being called
            event_id: Optional associated event ID
        """
        message = {
            "version": "1.0",
            "type": "action",
            "timestamp": time.time(),
            "payload": {
                "tool": tool_name,
                "event_id": event_id,
            },
        }

        await self._manager.broadcast(message)
        self._log.debug("action_emitted", tool=tool_name)

    async def emit_emotion(
        self, emotion: Live2DEmotion, intensity: float = 1.0, duration: int | None = None
    ) -> None:
        """Emit an emotion change event.

        Args:
            emotion: The emotion to display
            intensity: Emotion intensity (0.0 - 1.0)
            duration: Optional duration in milliseconds
        """
        self._current_emotion = emotion

        message = {
            "version": "1.0",
            "type": "emotion",
            "timestamp": time.time(),
            "payload": {
                "emotion": emotion.value,
                "intensity": intensity,
                "duration": duration,
            },
        }

        await self._manager.broadcast(message)
        self._log.debug("emotion_emitted", emotion=emotion.value, intensity=intensity)

    async def emit_motion(
        self, motion: Live2DMotion, group: str | None = None, loop: bool = False
    ) -> None:
        """Emit a motion trigger event.

        Args:
            motion: The motion to play
            group: Optional motion group
            loop: Whether to loop the motion
        """
        message = {
            "version": "1.0",
            "type": "motion",
            "timestamp": time.time(),
            "payload": {
                "motion": motion.value,
                "group": group,
                "loop": loop,
            },
        }

        await self._manager.broadcast(message)
        self._log.debug("motion_emitted", motion=motion.value, loop=loop)

    async def emit_error(self, error: str, details: str | None = None) -> None:
        """Emit an error event.

        Args:
            error: Error message
            details: Optional error details
        """
        message = {
            "version": "1.0",
            "type": "error",
            "timestamp": time.time(),
            "payload": {
                "error": error,
                "details": details,
            },
        }

        await self._manager.broadcast(message)
        self._log.warning("error_emitted", error=error)

    @property
    def current_state(self) -> NakariState:
        """Get the current state."""
        return self._current_state

    @property
    def current_emotion(self) -> Live2DEmotion:
        """Get the current emotion."""
        return self._current_emotion
