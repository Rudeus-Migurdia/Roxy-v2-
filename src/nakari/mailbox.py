from __future__ import annotations

import asyncio

import structlog

from nakari.models import Event, EventStatus


class Mailbox:
    def __init__(self) -> None:
        self._events: dict[str, Event] = {}
        self._archive: list[Event] = []
        self._notify: asyncio.Event = asyncio.Event()
        self._log = structlog.get_logger("mailbox")

    async def put(self, event: Event) -> None:
        self._events[event.id] = event
        self._notify.set()
        self._log.info("event_enqueued", event_id=event.id, type=event.type.value)

    def get(self, event_id: str) -> Event | None:
        return self._events.get(event_id)

    def list_events(self, status: EventStatus | None = None) -> list[Event]:
        events = list(self._events.values())
        if status is not None:
            events = [e for e in events if e.status == status]
        return sorted(events, key=lambda e: (-e.priority, e.created_at))

    def update(self, event_id: str, **fields: object) -> Event | None:
        event = self._events.get(event_id)
        if event is None:
            return None
        for key, value in fields.items():
            if hasattr(event, key):
                setattr(event, key, value)
        self._log.info("event_updated", event_id=event_id, fields=list(fields.keys()))
        return event

    def delete(self, event_id: str) -> bool:
        event = self._events.pop(event_id, None)
        if event is not None:
            self._log.info("event_deleted", event_id=event_id)
            return True
        return False

    def archive(self, event: Event) -> None:
        event.status = EventStatus.COMPLETED
        self._events.pop(event.id, None)
        self._archive.append(event)
        self._log.info("event_archived", event_id=event.id)

    async def wait_for_events(self) -> None:
        """Block until there is at least one PENDING event."""
        # Clear the event before checking to avoid race condition
        self._notify.clear()
        while not any(e.status == EventStatus.PENDING for e in self._events.values()):
            await self._notify.wait()
            self._notify.clear()

    def qsize(self) -> int:
        return len(self._events)
