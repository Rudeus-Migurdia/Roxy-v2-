from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from nakari.config import Config
from nakari.mailbox import Mailbox
from nakari.models import Attachment, Event, EventStatus, EventType
from nakari.tool_registry import ToolRegistry

if TYPE_CHECKING:
    from nakari.loop import LoopState


def _event_to_dict(event: Event) -> dict[str, Any]:
    return {
        "id": event.id,
        "type": event.type.value,
        "status": event.status.value,
        "priority": event.priority,
        "content": event.content,
        "attachments": [
            {"mime_type": a.mime_type, "uri": a.uri, "metadata": a.metadata}
            for a in event.attachments
        ],
        "max_tool_calls": event.max_tool_calls,
        "metadata": event.metadata,
        "suspend_notes": event.suspend_notes,
        "created_at": event.created_at,
    }


def register_mailbox_tools(
    registry: ToolRegistry,
    mailbox: Mailbox,
    loop_state: LoopState,
    config: Config,
) -> None:
    # ── mailbox_list ──────────────────────────────────────────────

    async def mailbox_list(status: str | None = None) -> str:
        filter_status = EventStatus(status) if status else None
        events = mailbox.list_events(filter_status)
        return json.dumps(
            [_event_to_dict(e) for e in events],
            ensure_ascii=False,
        )

    registry.register(
        name="mailbox_list",
        description=(
            "List all events in the mailbox. "
            "Optionally filter by status. Returns events sorted by priority (desc) then time (asc)."
        ),
        parameters={
            "type": "object",
            "properties": {
                "status": {
                    "type": ["string", "null"],
                    "enum": ["pending", "processing", "suspended", None],
                    "description": "Filter by event status. Null returns all.",
                },
            },
            "required": [],
            "additionalProperties": False,
        },
        handler=mailbox_list,
    )

    # ── mailbox_add ───────────────────────────────────────────────

    async def mailbox_add(
        type: str,
        content: str,
        priority: int | None = None,
        max_tool_calls: int | None = None,
        attachments: list[dict[str, Any]] | None = None,
    ) -> str:
        parsed_attachments = [
            Attachment(
                mime_type=a["mime_type"],
                uri=a["uri"],
                metadata=a.get("metadata", {}),
            )
            for a in (attachments or [])
        ]
        event = Event(
            type=EventType(type),
            content=content,
            priority=priority or 0,
            attachments=parsed_attachments,
            max_tool_calls=max_tool_calls or config.default_max_tool_calls,
        )
        await mailbox.put(event)
        return json.dumps(
            {"created": event.id, "priority": event.priority},
            ensure_ascii=False,
        )

    registry.register(
        name="mailbox_add",
        description="Create a new event and add it to the mailbox.",
        parameters={
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["user_text", "self_created", "timer", "system"],
                    "description": "Event type.",
                },
                "content": {
                    "type": "string",
                    "description": "Event content/description.",
                },
                "priority": {
                    "type": ["integer", "null"],
                    "description": "Priority (higher = more important). Null defaults to 0.",
                },
                "max_tool_calls": {
                    "type": ["integer", "null"],
                    "description": "Tool call budget. Null for default.",
                },
                "attachments": {
                    "type": ["array", "null"],
                    "description": "Optional file attachments.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "mime_type": {
                                "type": "string",
                                "description": "MIME type, e.g. audio/wav",
                            },
                            "uri": {
                                "type": "string",
                                "description": "File path or URL",
                            },
                            "metadata": {
                                "type": "object",
                                "description": "Optional attachment metadata",
                                "additionalProperties": True,
                            },
                        },
                        "required": ["mime_type", "uri"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["type", "content"],
            "additionalProperties": False,
        },
        handler=mailbox_add,
    )

    # ── mailbox_update ────────────────────────────────────────────

    async def mailbox_update(
        event_id: str,
        content: str | None = None,
        priority: int | None = None,
        status: str | None = None,
        suspend_notes: str | None = None,
        metadata: str | None = None,
    ) -> str:
        event = mailbox.get(event_id)
        if event is None:
            return f"Error: Event {event_id} not found."

        fields: dict[str, Any] = {}
        if content is not None:
            fields["content"] = content
        if priority is not None:
            fields["priority"] = priority
        if status is not None:
            fields["status"] = EventStatus(status)
        if suspend_notes is not None:
            fields["suspend_notes"] = suspend_notes
        if metadata is not None:
            parsed = json.loads(metadata)
            event.metadata.update(parsed)

        if fields:
            mailbox.update(event_id, **fields)

        return json.dumps(_event_to_dict(event), ensure_ascii=False)

    registry.register(
        name="mailbox_update",
        description=(
            "Update fields of an existing event. "
            "Pass only the fields you want to change; others remain unchanged."
        ),
        parameters={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "ID of the event to update.",
                },
                "content": {
                    "type": ["string", "null"],
                    "description": "New content. Null to keep current.",
                },
                "priority": {
                    "type": ["integer", "null"],
                    "description": "New priority. Null to keep current.",
                },
                "status": {
                    "type": ["string", "null"],
                    "enum": ["pending", "processing", "suspended", None],
                    "description": "New status. Null to keep current.",
                },
                "suspend_notes": {
                    "type": ["string", "null"],
                    "description": "Progress notes. Null to keep current.",
                },
                "metadata": {
                    "type": ["string", "null"],
                    "description": "JSON string of metadata fields to merge. Null to keep current.",
                },
            },
            "required": ["event_id"],
            "additionalProperties": False,
        },
        handler=mailbox_update,
    )

    # ── mailbox_delete ────────────────────────────────────────────

    async def mailbox_delete(event_id: str) -> str:
        if mailbox.delete(event_id):
            # If deleting the current event, clear loop state
            if loop_state.current_event and loop_state.current_event.id == event_id:
                loop_state.clear_current_event()
            return f"Event {event_id} deleted."
        return f"Error: Event {event_id} not found."

    registry.register(
        name="mailbox_delete",
        description="Delete an event from the mailbox.",
        parameters={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "ID of the event to delete.",
                },
            },
            "required": ["event_id"],
            "additionalProperties": False,
        },
        handler=mailbox_delete,
    )

    # ── mailbox_pick ──────────────────────────────────────────────

    async def mailbox_pick(event_id: str) -> str:
        if loop_state.current_event:
            return (
                f"Error: Already processing event {loop_state.current_event.id}. "
                f"Call mailbox_done first."
            )
        event = mailbox.get(event_id)
        if event is None:
            return f"Error: Event {event_id} not found."
        event.status = EventStatus.PROCESSING
        loop_state.set_current_event(event)
        return json.dumps(_event_to_dict(event), ensure_ascii=False)

    registry.register(
        name="mailbox_pick",
        description=(
            "Pick an event to start processing. "
            "Sets it as your current event and starts the tool call budget."
        ),
        parameters={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "ID of the event to pick up.",
                },
            },
            "required": ["event_id"],
            "additionalProperties": False,
        },
        handler=mailbox_pick,
    )

    # ── mailbox_done ──────────────────────────────────────────────

    async def mailbox_done(summary: str) -> str:
        current = loop_state.current_event
        if not current:
            return "Error: No event currently being processed."
        current.metadata["completion_summary"] = summary
        mailbox.archive(current)
        loop_state.clear_current_event()
        return f"Event {current.id} completed and archived."

    registry.register(
        name="mailbox_done",
        description="Mark the current event as completed and archive it.",
        parameters={
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Brief summary of what was done.",
                },
            },
            "required": ["summary"],
            "additionalProperties": False,
        },
        handler=mailbox_done,
    )

    # ── mailbox_wait ──────────────────────────────────────────────

    async def mailbox_wait() -> str:
        await mailbox.wait_for_events()
        events = mailbox.list_events(EventStatus.PENDING)
        return json.dumps(
            {"pending_count": len(events), "events": [_event_to_dict(e) for e in events]},
            ensure_ascii=False,
        )

    registry.register(
        name="mailbox_wait",
        description=(
            "Wait until new events arrive in the mailbox. "
            "Use this when the mailbox is empty and you have nothing to process. "
            "Blocks until at least one pending event is available, then returns them."
        ),
        parameters={
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        handler=mailbox_wait,
    )
