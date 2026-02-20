from __future__ import annotations

from nakari.context import ContextManager
from nakari.llm import LLMClient
from nakari.tool_registry import ToolRegistry


def register_context_tools(
    registry: ToolRegistry,
    context: ContextManager,
    llm: LLMClient,
) -> None:
    async def compress_context(instructions: str) -> str:
        current_text = context.get_recent_context_text()
        if not current_text.strip():
            return "Nothing to compress — context is already minimal."

        summary_response = await llm.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a context compression assistant. "
                        "Summarize the following conversation context according to the instructions provided. "
                        "Preserve key information, decisions, and any ongoing task state."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Instructions: {instructions}\n\n---\nContext to compress:\n{current_text}",
                },
            ],
            tools=None,
        )
        summary = summary_response.choices[0].message.content or ""
        context.active_compress(summary)
        return f"Context compressed. New token count: {context.count_tokens()}"

    registry.register(
        name="compress_context",
        description=(
            "Actively compress the current conversation context. "
            "Provide instructions on what information to preserve and what can be discarded. "
            "A summary will replace the current context."
        ),
        parameters={
            "type": "object",
            "properties": {
                "instructions": {
                    "type": "string",
                    "description": "Instructions on what to preserve and what to discard",
                },
            },
            "required": ["instructions"],
            "additionalProperties": False,
        },
        handler=compress_context,
    )
