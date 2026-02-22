"""Live2D API configuration."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Live2DConfig:
    """Live2D configuration."""

    # Model settings
    model_name: str = "haru"
    available_models: list[str] = None

    # Feature flags
    lip_sync_enabled: bool = True
    auto_idle: bool = True

    # Audio settings
    sample_rate: int = 24000
    chunk_size: int = 4096
    format: str = "mp3"

    def __post_init__(self) -> None:
        if self.available_models is None:
            self.available_models = ["haru", "hiyori", "hifuu"]


# Global config instance
_config: Live2DConfig | None = None


def get_config() -> Live2DConfig:
    """Get the global Live2D configuration instance.

    Returns:
        Live2DConfig instance
    """
    global _config
    if _config is None:
        _config = Live2DConfig()
    return _config


def set_config(config: Live2DConfig) -> None:
    """Set the global Live2D configuration.

    Args:
        config: The configuration to set
    """
    global _config
    _config = config
