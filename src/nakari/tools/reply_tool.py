from __future__ import annotations

from typing import TYPE_CHECKING, Awaitable, Callable

from nakari.tool_registry import ToolRegistry

if TYPE_CHECKING:
    from nakari.tts import TTSPlayer


def register_reply_tool(
    registry: ToolRegistry,
    output_callback: Callable[[str], Awaitable[None]],
    tts_player: TTSPlayer | None = None,
    multi_output_handler = None,
) -> None:
    """Register the reply tool.

    Args:
        registry: The ToolRegistry to register with
        output_callback: Async callback for output (e.g., CLI.print_reply)
        tts_player: Optional TTSPlayer for speech output
        multi_output_handler: Optional MultiOutputHandler for broadcasting to
                             multiple endpoints (CLI + WebSocket)
    """
    async def reply(message: str, speak: bool = False) -> str:
        # Use multi-output handler if available, otherwise use direct callback
        if multi_output_handler is not None:
            await multi_output_handler.emit(message)
        else:
            await output_callback(message)

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
