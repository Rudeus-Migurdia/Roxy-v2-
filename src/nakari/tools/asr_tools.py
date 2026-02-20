from __future__ import annotations

import asyncio
import json
from pathlib import Path

import structlog
from openai import AsyncOpenAI

from nakari.config import Config
from nakari.tool_registry import ToolRegistry

_log = structlog.get_logger("asr")


async def _transcribe_whisper_api(
    audio_path: Path,
    config: Config,
    language: str | None,
) -> dict[str, str | float]:
    client = AsyncOpenAI(
        api_key=config.openai_api_key,
        base_url=config.openai_base_url,
    )
    model = config.asr_model or "whisper-1"
    with audio_path.open("rb") as f:
        response = await client.audio.transcriptions.create(
            model=model,
            file=f,
            language=language,
            response_format="verbose_json",
        )
    return {
        "text": response.text,
        "language": response.language or "",
        "duration_s": response.duration or 0.0,
    }


async def _transcribe_faster_whisper(
    audio_path: Path,
    config: Config,
    language: str | None,
) -> dict[str, str | float]:
    from faster_whisper import WhisperModel

    model_name = config.asr_model or "large-v3"

    def _run() -> dict[str, str | float]:
        model = WhisperModel(model_name)
        segments, info = model.transcribe(
            str(audio_path),
            language=language,
        )
        text = "".join(seg.text for seg in segments)
        return {
            "text": text,
            "language": info.language,
            "duration_s": info.duration,
        }

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _run)


def register_asr_tools(registry: ToolRegistry, config: Config) -> None:
    async def transcribe(
        audio_uri: str,
        language: str | None = None,
    ) -> str:
        audio_path = Path(audio_uri)
        if not audio_path.exists():
            return json.dumps({"error": f"File not found: {audio_uri}"})

        _log.info(
            "transcribe_start",
            backend=config.asr_backend,
            path=audio_uri,
        )

        if config.asr_backend == "faster_whisper":
            result = await _transcribe_faster_whisper(audio_path, config, language)
        else:
            result = await _transcribe_whisper_api(audio_path, config, language)

        _log.info("transcribe_done", text_len=len(result["text"]))
        return json.dumps(result, ensure_ascii=False)

    registry.register(
        name="transcribe",
        description=(
            "Transcribe an audio file to text using ASR. "
            "Provide the file path from the event attachment."
        ),
        parameters={
            "type": "object",
            "properties": {
                "audio_uri": {
                    "type": "string",
                    "description": "Path to the audio file to transcribe",
                },
                "language": {
                    "type": ["string", "null"],
                    "description": "Language code (e.g. 'zh', 'en'). Null for auto-detect.",
                },
            },
            "required": ["audio_uri", "language"],
            "additionalProperties": False,
        },
        handler=transcribe,
    )
