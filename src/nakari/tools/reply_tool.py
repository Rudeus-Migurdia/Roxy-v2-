from __future__ import annotations

import structlog
from typing import TYPE_CHECKING, Awaitable, Callable

from nakari.tool_registry import ToolRegistry

if TYPE_CHECKING:
    from nakari.frontend_adapter.state_emitter import StateEmitter
    from nakari.tts import TTSPlayer
    from nakari.journal import JournalStore


def register_reply_tool(
    registry: ToolRegistry,
    output_callback: Callable[[str], Awaitable[None]],
    tts_player: TTSPlayer | None = None,
    multi_output_handler = None,
    state_emitter: StateEmitter | None = None,
    journal: JournalStore | None = None,
) -> None:
    """Register the reply tool.

    Args:
        registry: The ToolRegistry to register with
        output_callback: Async callback for output (e.g., CLI.print_reply)
        tts_player: Optional TTSPlayer for speech output
        multi_output_handler: Optional MultiOutputHandler for broadcasting to
                             multiple endpoints (CLI + WebSocket)
        state_emitter: Optional StateEmitter for Live2D emotion/motion control
    """
    async def reply(message: str, speak: bool = False) -> str:
        # Log the assistant reply to journal for chat history
        _log = structlog.get_logger("reply_tool")
        _log.info("reply_called", message_length=len(message), journal_present=journal is not None)

        if journal is not None:
            _log.info("logging_assistant_reply", content_length=len(message), content_preview=message[:100])
            await journal.log_message(role="assistant", content=message)
            _log.info("assistant_reply_logged")
        else:
            _log.warning("journal_is_none_skipping_log")

        # Use multi-output handler if available, otherwise use direct callback
        if multi_output_handler is not None:
            await multi_output_handler.emit(message)
        else:
            await output_callback(message)

        # Detect and emit emotion for Live2D
        if state_emitter is not None:
            from nakari.emotion.analyzer import EmotionAnalyzer
            from nakari.frontend_adapter.state_emitter import Live2DEmotion

            log = structlog.get_logger("reply_tool")
            analyzer = EmotionAnalyzer()
            result = analyzer.analyze(message)

            # Log emotion detection result
            log.info(
                "emotion_detected",
                emotion=result.emotion.value,
                intensity=result.intensity,
                confidence=result.confidence,
                message_preview=message[:50],
            )

            # Send to Live2D if non-neutral emotion detected
            if result.emotion.value != "neutral":
                emotion = Live2DEmotion[result.emotion.value.upper()]
                await state_emitter.emit_emotion(emotion, result.intensity)
                log.info("emotion_sent", emotion=emotion.value, intensity=result.intensity)

        # TTS output (audio will also be broadcast if AudioBroadcaster is configured)
        if speak and tts_player is not None:
            tts_player.speak_background(message)

        return "Reply sent."

    registry.register(
        name="reply",
        description=(
            "Send a message to the user. This is the only way to communicate "
            "with the user. Set speak=true to also read the message aloud via "
            "text-to-speech."
        ),
        parameters={
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "The message to send to the user",
                },
                "speak": {
                    "type": "boolean",
                    "description": (
                        "If true, the message will also be spoken aloud. "
                        "Use for conversational replies. Leave false for "
                        "long outputs, code, or structured data."
                    ),
                },
            },
            "required": ["message", "speak"],
            "additionalProperties": False,
        },
        handler=reply,
    )
