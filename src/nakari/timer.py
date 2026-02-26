from __future__ import annotations

import asyncio
import time
import uuid
from pathlib import Path
from typing import Any

import aiosqlite
import structlog

from nakari.mailbox import Mailbox
from nakari.models import Event, EventType

_SCHEMA = """\
CREATE TABLE IF NOT EXISTS timers (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    timer_type        TEXT NOT NULL CHECK(timer_type IN ('interval', 'once')),
    interval_seconds  INTEGER,
    fire_at           REAL,
    last_fired_at     REAL,
    content           TEXT NOT NULL,
    max_tool_calls    INTEGER NOT NULL DEFAULT 15,
    enabled           INTEGER NOT NULL DEFAULT 1,
    created_at        REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timers_enabled ON timers(enabled);
CREATE INDEX IF NOT EXISTS idx_timers_fire_at ON timers(fire_at);
"""


class TimerStore:
    def __init__(self) -> None:
        self._db: aiosqlite.Connection | None = None
        self._log = structlog.get_logger("timer")

    async def connect(self, db_path: str) -> None:
        path = Path(db_path).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(str(path))
        self._db.row_factory = aiosqlite.Row
        await self._db.executescript(_SCHEMA)
        await self._db.commit()
        self._log.info("timer_store_connected", path=str(path))

    async def close(self) -> None:
        if self._db:
            await self._db.close()
            self._db = None

    async def create_timer(
        self,
        name: str,
        timer_type: str,
        content: str,
        interval_seconds: int | None = None,
        fire_at: float | None = None,
        max_tool_calls: int = 15,
    ) -> dict[str, Any]:
        assert self._db is not None
        now = time.time()
        timer_id = uuid.uuid4().hex[:12]

        if timer_type == "interval":
            if not interval_seconds or interval_seconds <= 0:
                raise ValueError("interval timer requires interval_seconds > 0")
            computed_fire_at = now + interval_seconds
        elif timer_type == "once":
            if fire_at is None:
                raise ValueError("once timer requires fire_at")
            computed_fire_at = fire_at
        else:
            raise ValueError(f"unknown timer_type: {timer_type}")

        await self._db.execute(
            "INSERT INTO timers (id, name, timer_type, interval_seconds, fire_at, "
            "last_fired_at, content, max_tool_calls, enabled, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
            (
                timer_id,
                name,
                timer_type,
                interval_seconds,
                computed_fire_at,
                None,
                content,
                max_tool_calls,
                now,
            ),
        )
        await self._db.commit()

        timer = {
            "id": timer_id,
            "name": name,
            "timer_type": timer_type,
            "interval_seconds": interval_seconds,
            "fire_at": computed_fire_at,
            "last_fired_at": None,
            "content": content,
            "max_tool_calls": max_tool_calls,
            "enabled": True,
            "created_at": now,
        }
        self._log.info("timer_created", timer_id=timer_id, name=name, timer_type=timer_type)
        return timer

    async def delete_timer(self, timer_id: str) -> bool:
        assert self._db is not None
        cursor = await self._db.execute(
            "DELETE FROM timers WHERE id = ?", (timer_id,)
        )
        await self._db.commit()
        deleted = cursor.rowcount > 0
        if deleted:
            self._log.info("timer_deleted", timer_id=timer_id)
        return deleted

    async def list_timers(
        self, include_disabled: bool = False
    ) -> list[dict[str, Any]]:
        assert self._db is not None
        if include_disabled:
            cursor = await self._db.execute(
                "SELECT * FROM timers ORDER BY created_at DESC"
            )
        else:
            cursor = await self._db.execute(
                "SELECT * FROM timers WHERE enabled = 1 ORDER BY created_at DESC"
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get_due_timers(self, now: float) -> list[dict[str, Any]]:
        assert self._db is not None
        cursor = await self._db.execute(
            "SELECT * FROM timers WHERE enabled = 1 AND fire_at <= ?",
            (now,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def mark_fired(self, timer_id: str, now: float) -> None:
        assert self._db is not None
        cursor = await self._db.execute(
            "SELECT timer_type, interval_seconds FROM timers WHERE id = ?",
            (timer_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return

        if row["timer_type"] == "interval":
            new_fire_at = now + row["interval_seconds"]
            await self._db.execute(
                "UPDATE timers SET last_fired_at = ?, fire_at = ? WHERE id = ?",
                (now, new_fire_at, timer_id),
            )
        else:
            await self._db.execute(
                "UPDATE timers SET last_fired_at = ?, enabled = 0 WHERE id = ?",
                (now, timer_id),
            )
        await self._db.commit()


async def run_timer_loop(
    timer_store: TimerStore,
    mailbox: Mailbox,
    check_interval: int = 10,
) -> None:
    """Background task: checks for due timers and enqueues TIMER events."""
    log = structlog.get_logger("timer_loop")
    log.info("timer_loop_started", check_interval=check_interval)

    consecutive_errors = 0
    max_consecutive_errors = 5

    while True:
        try:
            now = time.time()
            due_timers = await timer_store.get_due_timers(now)

            for timer in due_timers:
                event = Event(
                    type=EventType.TIMER,
                    content=timer["content"],
                    max_tool_calls=timer["max_tool_calls"],
                    metadata={
                        "timer_id": timer["id"],
                        "timer_name": timer["name"],
                        "timer_type": timer["timer_type"],
                    },
                )
                await mailbox.put(event)
                await timer_store.mark_fired(timer["id"], now)
                log.info(
                    "timer_fired",
                    timer_id=timer["id"],
                    name=timer["name"],
                    timer_type=timer["timer_type"],
                )
            # Reset error counter on success
            consecutive_errors = 0
        except Exception:
            consecutive_errors += 1
            log.error("timer_loop_error", consecutive_errors=consecutive_errors, exc_info=True)
            # Use exponential backoff for repeated errors to avoid CPU spinning
            if consecutive_errors >= max_consecutive_errors:
                log.warning("timer_loop_too_many_errors", sleep_seconds=60)
                await asyncio.sleep(60)  # Wait longer if errors persist
                continue

        # Standard sleep interval
        await asyncio.sleep(check_interval)
