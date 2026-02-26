from __future__ import annotations

import json
from datetime import datetime

from nakari.timer import TimerStore
from nakari.tool_registry import ToolRegistry


def register_timer_tools(
    registry: ToolRegistry,
    timer_store: TimerStore,
) -> None:
    async def create_timer(
        name: str,
        timer_type: str,
        content: str,
        interval_seconds: int | None,
        fire_at: str | None,
        max_tool_calls: int,
    ) -> str:
        fire_at_epoch: float | None = None
        if fire_at is not None:
            fire_at_epoch = datetime.fromisoformat(fire_at).timestamp()

        timer = await timer_store.create_timer(
            name=name,
            timer_type=timer_type,
            content=content,
            interval_seconds=interval_seconds,
            fire_at=fire_at_epoch,
            max_tool_calls=max_tool_calls,
        )
        return json.dumps(timer, default=str, ensure_ascii=False)

    async def delete_timer(timer_id: str) -> str:
        deleted = await timer_store.delete_timer(timer_id)
        if deleted:
            return json.dumps({"status": "deleted", "timer_id": timer_id})
        return json.dumps({"status": "not_found", "timer_id": timer_id})

    async def list_timers(include_disabled: bool) -> str:
        timers = await timer_store.list_timers(include_disabled=include_disabled)
        return json.dumps(timers, default=str, ensure_ascii=False)

    registry.register(
        name="create_timer",
        description=(
            "Create a persistent timer that fires events into the mailbox. "
            "Use timer_type 'interval' for recurring timers (e.g. every 30 minutes) "
            "or 'once' for one-shot timers at a specific datetime. "
            "When the timer fires, an event with the given content will be enqueued."
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Human-readable name for the timer",
                },
                "timer_type": {
                    "type": "string",
                    "enum": ["interval", "once"],
                    "description": "Timer type: 'interval' for recurring, 'once' for one-shot",
                },
                "content": {
                    "type": "string",
                    "description": "The event content/instruction when the timer fires",
                },
                "interval_seconds": {
                    "type": ["integer", "null"],
                    "description": "Seconds between fires (required for interval type, null for once)",
                },
                "fire_at": {
                    "type": ["string", "null"],
                    "description": (
                        "ISO 8601 datetime for one-shot timers "
                        "(e.g. '2026-02-17T09:00:00'). Null for interval type."
                    ),
                },
                "max_tool_calls": {
                    "type": "integer",
                    "description": "Tool call budget for the generated event (default 15)",
                },
            },
            "required": ["name", "timer_type", "content"],
            "additionalProperties": False,
        },
        handler=create_timer,
    )

    registry.register(
        name="delete_timer",
        description="Delete a timer by its ID. The timer will no longer fire.",
        parameters={
            "type": "object",
            "properties": {
                "timer_id": {
                    "type": "string",
                    "description": "The ID of the timer to delete",
                },
            },
            "required": ["timer_id"],
            "additionalProperties": False,
        },
        handler=delete_timer,
    )

    registry.register(
        name="list_timers",
        description=(
            "List all timers. By default only shows enabled (active) timers. "
            "Set include_disabled=true to also see fired one-shot timers."
        ),
        parameters={
            "type": "object",
            "properties": {
                "include_disabled": {
                    "type": "boolean",
                    "description": "Whether to include disabled/fired one-shot timers (default false)",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
        handler=list_timers,
    )
