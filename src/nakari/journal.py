from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

import aiosqlite
import structlog

_SCHEMA = """\
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    started_at  REAL NOT NULL,
    ended_at    REAL
);

CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT NOT NULL REFERENCES sessions(id),
    role         TEXT NOT NULL,
    content      TEXT,
    tool_calls   TEXT,
    tool_call_id TEXT,
    event_id     TEXT,
    created_at   REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id);
"""


class JournalStore:
    def __init__(self) -> None:
        self._db: aiosqlite.Connection | None = None
        self._session_id: str | None = None
        self._log = structlog.get_logger("journal")

    @property
    def session_id(self) -> str | None:
        return self._session_id

    async def connect(self, db_path: str) -> None:
        path = Path(db_path).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(str(path))
        self._db.row_factory = aiosqlite.Row
        await self._db.executescript(_SCHEMA)
        await self._db.commit()
        self._log.info("journal_connected", path=str(path))

    async def close(self) -> None:
        if self._session_id:
            await self.end_session()
        if self._db:
            await self._db.close()
            self._db = None

    async def start_session(self) -> str:
        assert self._db is not None
        sid = uuid.uuid4().hex[:12]
        await self._db.execute(
            "INSERT INTO sessions (id, started_at) VALUES (?, ?)",
            (sid, time.time()),
        )
        await self._db.commit()
        self._session_id = sid
        self._log.info("session_started", session_id=sid)
        return sid

    async def end_session(self) -> None:
        if not self._db or not self._session_id:
            return
        await self._db.execute(
            "UPDATE sessions SET ended_at = ? WHERE id = ?",
            (time.time(), self._session_id),
        )
        await self._db.commit()
        self._log.info("session_ended", session_id=self._session_id)
        self._session_id = None

    async def log_message(
        self,
        role: str,
        content: str | None = None,
        tool_calls: list[dict[str, Any]] | None = None,
        tool_call_id: str | None = None,
        event_id: str | None = None,
    ) -> None:
        if not self._db or not self._session_id:
            return
        await self._db.execute(
            "INSERT INTO messages (session_id, role, content, tool_calls, tool_call_id, event_id, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                self._session_id,
                role,
                content,
                json.dumps(tool_calls, ensure_ascii=False) if tool_calls else None,
                tool_call_id,
                event_id,
                time.time(),
            ),
        )
        await self._db.commit()

    # ── Query methods (used by tools) ────────────────────────────

    async def list_sessions(
        self, limit: int = 10, offset: int = 0
    ) -> list[dict[str, Any]]:
        assert self._db is not None
        cursor = await self._db.execute(
            "SELECT s.id, s.started_at, s.ended_at, "
            "  (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count "
            "FROM sessions s ORDER BY s.started_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def read_session(
        self, session_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        assert self._db is not None
        cursor = await self._db.execute(
            "SELECT id, role, content, tool_calls, tool_call_id, event_id, created_at "
            "FROM messages WHERE session_id = ? ORDER BY id LIMIT ? OFFSET ?",
            (session_id, limit, offset),
        )
        rows = await cursor.fetchall()
        results: list[dict[str, Any]] = []
        for r in rows:
            row = dict(r)
            if row["tool_calls"]:
                row["tool_calls"] = json.loads(row["tool_calls"])
            results.append(row)
        return results

    async def search(
        self, keyword: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        assert self._db is not None
        cursor = await self._db.execute(
            "SELECT m.id, m.session_id, m.role, m.content, m.tool_call_id, m.event_id, m.created_at "
            "FROM messages m WHERE m.content LIKE ? ORDER BY m.id DESC LIMIT ?",
            (f"%{keyword}%", limit),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def query(self, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
        assert self._db is not None
        stripped = sql.strip().upper()
        if not stripped.startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed.")
        cursor = await self._db.execute(sql, params or [])
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
