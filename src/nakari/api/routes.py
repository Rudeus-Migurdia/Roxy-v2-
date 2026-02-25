"""HTTP API routes for nakari Live2D frontend.

Provides REST endpoints for configuration, model management,
and utility functions.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import structlog

from nakari.api.config import Live2DConfig, get_config
from nakari.journal import JournalStore

_log = structlog.get_logger("api_routes")

router = APIRouter()

# Global journal store instance (set in __main__.py)
_journal_store: JournalStore | None = None


def get_journal() -> JournalStore:
    """Dependency to get journal store instance."""
    global _journal_store
    if _journal_store is None:
        raise HTTPException(status_code=500, detail="Journal not initialized")
    return _journal_store


# Request models for session management
class SessionTitleUpdate(BaseModel):
    title: str


@router.get("/api/config")
async def get_live2d_config(config: Live2DConfig = Depends(get_config)) -> dict:
    """Get Live2D configuration.

    Returns:
        Live2D configuration including model settings and audio config
    """
    return {
        "live2d": {
            "model_name": config.model_name,
            "available_models": config.available_models,
            "lip_sync_enabled": config.lip_sync_enabled,
            "auto_idle": config.auto_idle,
        },
        "audio": {
            "sample_rate": config.sample_rate,
            "chunk_size": config.chunk_size,
            "format": config.format,
        },
    }


@router.post("/api/config")
async def update_live2d_config(
    updates: dict,
    config: Live2DConfig = Depends(get_config),
) -> dict:
    """Update Live2D configuration.

    Args:
        updates: Configuration updates

    Returns:
        Updated configuration
    """
    # Update allowed fields
    allowed_fields = {"model_name", "lip_sync_enabled", "auto_idle"}
    for field, value in updates.items():
        if field in allowed_fields and hasattr(config, field):
            setattr(config, field, value)
            _log.info("config_updated", field=field, value=value)

    return await get_live2d_config(config)


@router.get("/api/models")
async def list_models(config: Live2DConfig = Depends(get_config)) -> dict:
    """List available Live2D models.

    Returns:
        List of available models with metadata
    """
    return {
        "models": [
            {
                "name": model,
                "display_name": model.replace("_", " ").title(),
            }
            for model in config.available_models
        ]
    }


@router.get("/api/emotions")
async def list_emotions() -> dict:
    """List available emotions.

    Returns:
        List of available emotions with descriptions
    """
    emotions = [
        {"id": "neutral", "name": "Neutral", "description": "Default calm expression"},
        {"id": "happy", "name": "Happy", "description": "Joyful expression with smile"},
        {"id": "sad", "name": "Sad", "description": "Downcast expression"},
        {"id": "angry", "name": "Angry", "description": "Upset expression"},
        {"id": "surprised", "name": "Surprised", "description": "Shocked expression"},
        {"id": "thinking", "name": "Thinking", "description": "Contemplative expression"},
    ]
    return {"emotions": emotions}


@router.get("/api/motions")
async def list_motions() -> dict:
    """List available motions.

    Returns:
        List of available motions
    """
    motions = [
        {"id": "idle", "name": "Idle", "description": "Breathing animation"},
        {"id": "happy", "name": "Happy", "description": "Happy motion"},
        {"id": "sad", "name": "Sad", "description": "Sad motion"},
        {"id": "angry", "name": "Angry", "description": "Angry motion"},
        {"id": "thinking", "name": "Thinking", "description": "Thinking motion"},
        {"id": "surprised", "name": "Surprised", "description": "Surprised motion"},
        {"id": "speaking", "name": "Speaking", "description": "Speaking animation"},
    ]
    return {"motions": motions}


# ─── Session Management Endpoints ─────────────────────────────────────────────


@router.get("/sessions")
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    journal: JournalStore = Depends(get_journal),
) -> dict:
    """List all conversation sessions with metadata.

    Args:
        limit: Maximum number of sessions to return
        offset: Number of sessions to skip

    Returns:
        Dictionary with sessions list
    """
    sessions = await journal.list_sessions(limit=limit, offset=offset)
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    journal: JournalStore = Depends(get_journal),
) -> dict:
    """Get a specific session with all its messages.

    Args:
        session_id: The session ID

    Returns:
        Session details with messages array
    """
    messages = await journal.read_session(session_id, limit=1000)
    # Get session metadata
    cursor = await journal._db.execute(  # type: ignore
        "SELECT id, started_at, ended_at, title FROM sessions WHERE id = ?",
        (session_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session": {
            "id": row["id"],
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "title": row["title"],
        },
        "messages": messages,
    }


@router.post("/sessions")
async def create_session(
    journal: JournalStore = Depends(get_journal),
) -> dict:
    """Create a new session and return its ID.

    Returns:
        New session ID and started_at timestamp
    """
    session_id = await journal.start_session()
    return {
        "session_id": session_id,
        "started_at": None,  # Would need to fetch from DB
    }


@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    updates: dict,
    journal: JournalStore = Depends(get_journal),
) -> dict:
    """Update session metadata (title, etc.).

    Args:
        session_id: The session ID
        updates: Fields to update (e.g., {"title": "New Title"})

    Returns:
        Updated session object
    """
    if "title" in updates:
        await journal.set_session_title(session_id, updates["title"])

    # Fetch updated session
    cursor = await journal._db.execute(  # type: ignore
        "SELECT id, started_at, ended_at, title FROM sessions WHERE id = ?",
        (session_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": row["id"],
        "started_at": row["started_at"],
        "ended_at": row["ended_at"],
        "title": row["title"],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    journal: JournalStore = Depends(get_journal),
) -> dict:
    """Delete a session and its messages.

    Args:
        session_id: The session ID to delete

    Returns:
        Success confirmation
    """
    await journal.delete_session(session_id)
    return {"success": True}


@router.post("/sessions/{session_id}/title")
async def set_session_title(
    session_id: str,
    title_data: SessionTitleUpdate,
    journal: JournalStore = Depends(get_journal),
) -> dict:
    """Set or update a session's title.

    Args:
        session_id: The session ID
        title_data: Object with title field

    Returns:
        Updated session ID and title
    """
    await journal.set_session_title(session_id, title_data.title)
    return {"session_id": session_id, "title": title_data.title}
