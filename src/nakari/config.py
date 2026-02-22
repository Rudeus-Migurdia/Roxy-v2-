from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


def safe_int(value: str | None, default: int, min_value: int | None = None, max_value: int | None = None) -> int:
    """安全地将字符串转换为整数，处理无效输入并限制范围

    Args:
        value: 要转换的字符串值
        default: 转换失败时的默认值
        min_value: 最小值（包含）
        max_value: 最大值（包含）

    Returns:
        转换后的整数值
    """
    if value is None:
        result = default
    else:
        try:
            result = int(value)
        except (ValueError, TypeError):
            result = default

    if min_value is not None and result < min_value:
        result = min_value
    if max_value is not None and result > max_value:
        result = max_value

    return result


def safe_float(value: str | None, default: float, min_value: float | None = None, max_value: float | None = None) -> float:
    """安全地将字符串转换为浮点数，处理无效输入并限制范围

    Args:
        value: 要转换的字符串值
        default: 转换失败时的默认值
        min_value: 最小值（包含）
        max_value: 最大值（包含）

    Returns:
        转换后的浮点数值
    """
    if value is None:
        result = default
    else:
        try:
            result = float(value)
        except (ValueError, TypeError):
            result = default

    if min_value is not None and result < min_value:
        result = min_value
    if max_value is not None and result > max_value:
        result = max_value

    return result


@dataclass(frozen=True)
class Config:
    openai_api_key: str
    openai_model: str
    openai_base_url: str | None
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    context_max_tokens: int
    context_target_tokens: int
    default_max_tool_calls: int
    embedding_model: str
    asr_backend: str
    asr_model: str
    asr_device: str
    audio_dir: str
    tts_backend: str
    tts_voice: str
    tts_speed: float
    tts_gptsov_url: str
    tts_gptsov_ref_audio: str
    tts_gptsov_ref_text: str
    tts_gptsov_ref_lang: str
    tts_player: str
    tavily_api_key: str
    journal_db_path: str
    timer_db_path: str
    timer_check_interval_seconds: int
    log_level: str

    # Live2D / API settings
    api_enabled: bool
    api_host: str
    api_port: int
    auto_shutdown_on_disconnect: bool
    auto_shutdown_delay_seconds: int

    @classmethod
    def from_env(cls) -> Config:
        load_dotenv()
        return cls(
            openai_api_key=os.environ["OPENAI_API_KEY"],
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            openai_base_url=os.getenv("OPENAI_BASE_URL", None),
            neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
            neo4j_password=os.getenv("NEO4J_PASSWORD", ""),
            context_max_tokens=safe_int(os.getenv("CONTEXT_MAX_TOKENS"), 120000, min_value=1000, max_value=1000000),
            context_target_tokens=safe_int(os.getenv("CONTEXT_TARGET_TOKENS"), 80000, min_value=1000, max_value=1000000),
            default_max_tool_calls=safe_int(os.getenv("DEFAULT_MAX_TOOL_CALLS"), 30, min_value=1, max_value=1000),
            embedding_model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
            asr_backend=os.getenv("ASR_BACKEND", "whisper_api"),
            asr_model=os.getenv("ASR_MODEL", ""),
            asr_device=os.getenv("ASR_DEVICE", "auto"),
            audio_dir=os.getenv("AUDIO_DIR", "/tmp/nakari/audio"),
            tts_backend=os.getenv("TTS_BACKEND", "edge_tts"),
            tts_voice=os.getenv("TTS_VOICE", ""),
            tts_speed=safe_float(os.getenv("TTS_SPEED"), 1.0, min_value=0.1, max_value=5.0),
            tts_gptsov_url=os.getenv("TTS_GPTSOV_URL", "http://localhost:9880"),
            tts_gptsov_ref_audio=os.getenv("TTS_GPTSOV_REF_AUDIO", ""),
            tts_gptsov_ref_text=os.getenv("TTS_GPTSOV_REF_TEXT", ""),
            tts_gptsov_ref_lang=os.getenv("TTS_GPTSOV_REF_LANG", "zh"),
            tts_player=os.getenv("TTS_PLAYER", "mpv"),
            tavily_api_key=os.getenv("TAVILY_API_KEY", ""),
            journal_db_path=os.getenv("JOURNAL_DB_PATH", "~/.nakari/journal.db"),
            timer_db_path=os.getenv("TIMER_DB_PATH", "~/.nakari/timers.db"),
            timer_check_interval_seconds=safe_int(os.getenv("TIMER_CHECK_INTERVAL_SECONDS"), 10, min_value=1, max_value=3600),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            # Live2D / API settings
            api_enabled=os.getenv("NAKARI_API_ENABLED", "false").lower() == "true",
            api_host=os.getenv("NAKARI_API_HOST", "127.0.0.1"),
            api_port=safe_int(os.getenv("NAKARI_API_PORT"), 8002, min_value=1, max_value=65535),
            auto_shutdown_on_disconnect=os.getenv("AUTO_SHUTDOWN_ON_DISCONNECT", "false").lower() == "true",
            auto_shutdown_delay_seconds=safe_int(os.getenv("AUTO_SHUTDOWN_DELAY_SECONDS"), "30", min_value=5, max_value=300),
        )
