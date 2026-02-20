"""HTTP API routes for nakari Live2D frontend.

Provides REST endpoints for configuration, model management,
and utility functions.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
import structlog

from nakari.api.config import Live2DConfig, get_config

_log = structlog.get_logger("api_routes")

router = APIRouter()


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
