from __future__ import annotations

import json

import structlog
from nakari.journal import JournalStore
from nakari.tool_registry import ToolRegistry

_log = structlog.get_logger("journal_tools")


def register_journal_tools(
    registry: ToolRegistry,
    journal: JournalStore,
) -> None:
    async def journal_list_sessions(limit: int = 10, offset: int = 0) -> str:
        sessions = await journal.list_sessions(limit=limit, offset=offset)
        return json.dumps(sessions, default=str, ensure_ascii=False)

    async def journal_read_session(
        session_id: str, limit: int = 50, offset: int = 0
    ) -> str:
        messages = await journal.read_session(
            session_id=session_id, limit=limit, offset=offset
        )
        return json.dumps(messages, default=str, ensure_ascii=False)

    async def journal_search(keyword: str, limit: int = 20) -> str:
        results = await journal.search(keyword=keyword, limit=limit)
        return json.dumps(results, default=str, ensure_ascii=False)

    async def journal_query(sql: str, params: str | None = None) -> str:
        try:
            parsed_params = json.loads(params) if params else None
        except json.JSONDecodeError as e:
            _log.error("json_decode_error", params=params[:100] if params else "", error=str(e))
            return json.dumps({"error": f"Invalid JSON in params parameter: {e}"}, ensure_ascii=False)
        results = await journal.query(sql=sql, params=parsed_params)
        return json.dumps(results, default=str, ensure_ascii=False)

    registry.register(
        name="journal_list_sessions",
        description=(
            "List recent conversation sessions from the journal. "
            "Each session corresponds to one process run. "
            "Returns session id, timestamps, and message count."
        ),
        parameters={
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max number of sessions to return (default 10)",
                },
                "offset": {
                    "type": "integer",
                    "description": "Number of sessions to skip (default 0)",
                },
            },
            "required": ["limit", "offset"],
            "additionalProperties": False,
        },
        handler=journal_list_sessions,
    )

    registry.register(
        name="journal_read_session",
        description=(
            "Read messages from a specific journal session. "
            "Use journal_list_sessions first to get session IDs. "
            "Returns messages in chronological order with role, content, tool calls, and event context."
        ),
        parameters={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The session ID to read",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of messages to return (default 50)",
                },
                "offset": {
                    "type": "integer",
                    "description": "Number of messages to skip (default 0)",
                },
            },
            "required": ["session_id", "limit", "offset"],
            "additionalProperties": False,
        },
        handler=journal_read_session,
    )

    registry.register(
        name="journal_search",
        description=(
            "Search journal message content by keyword. "
            "Returns matching messages across all sessions, most recent first."
        ),
        parameters={
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "The keyword to search for in message content",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of results to return (default 20)",
                },
            },
            "required": ["keyword", "limit"],
            "additionalProperties": False,
        },
        handler=journal_search,
    )

    registry.register(
        name="journal_query",
        description=(
            "Execute a read-only SQL query against the journal database. "
            "Tables: sessions (id, started_at, ended_at), "
            "messages (id, session_id, role, content, tool_calls, tool_call_id, event_id, created_at). "
            "Only SELECT statements are allowed."
        ),
        parameters={
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "The SQL SELECT query to execute",
                },
                "params": {
                    "type": ["string", "null"],
                    "description": "Optional JSON array of query parameters for ? placeholders",
                },
            },
            "required": ["sql", "params"],
            "additionalProperties": False,
        },
        handler=journal_query,
    )
