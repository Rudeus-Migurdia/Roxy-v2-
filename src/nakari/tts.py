from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Protocol

import structlog

from nakari.config import Config

_log = structlog.get_logger("tts")


# ---------------------------------------------------------------------------
# Backend protocol
# ---------------------------------------------------------------------------


class TTSBackend(Protocol):
    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """Yield audio chunks (mp3 or wav) for *text*."""
        ...


# ---------------------------------------------------------------------------
# edge-tts
# ---------------------------------------------------------------------------


class EdgeTTSBackend:
    def __init__(self, voice: str, speed: float) -> None:
        self._voice = voice if voice is not None else "zh-CN-XiaoxiaoNeural"
        self._speed = speed

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        import edge_tts

        rate_str = f"{(self._speed - 1) * 100:+.0f}%"
        communicate = edge_tts.Communicate(text, self._voice, rate=rate_str)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]


# ---------------------------------------------------------------------------
# OpenAI TTS
# ---------------------------------------------------------------------------


class OpenAITTSBackend:
    def __init__(
        self,
        api_key: str,
        base_url: str | None,
        voice: str,
        speed: float,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._voice = voice or "alloy"
        self._speed = speed

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url)
        async with client.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice=self._voice,
            input=text,
            speed=self._speed,
            response_format="mp3",
        ) as response:
            async for chunk in response.iter_bytes(chunk_size=4096):
                yield chunk


# ---------------------------------------------------------------------------
# GPT-SoVITS
# ---------------------------------------------------------------------------


class GPTSoVITSBackend:
    def __init__(
        self,
        api_url: str,
        ref_audio: str,
        ref_text: str,
        ref_lang: str,
        speed: float,
    ) -> None:
        self._api_url = api_url.rstrip("/")
        self._ref_audio = ref_audio
        self._ref_text = ref_text
        self._ref_lang = ref_lang
        self._speed = speed

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        import aiohttp

        payload = {
            "text": text,
            "text_lang": "auto",
            "ref_audio_path": self._ref_audio,
            "prompt_text": self._ref_text,
            "prompt_lang": self._ref_lang,
            "speed_factor": self._speed,
            "streaming_mode": True,
            "media_type": "wav",
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/tts", json=payload
            ) as resp:
                resp.raise_for_status()
                async for chunk in resp.content.iter_chunked(4096):
                    yield chunk


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def create_tts_backend(config: Config) -> TTSBackend:
    match config.tts_backend:
        case "edge_tts":
            return EdgeTTSBackend(config.tts_voice, config.tts_speed)
        case "openai_tts":
            return OpenAITTSBackend(
                config.openai_api_key,
                config.openai_base_url,
                config.tts_voice,
                config.tts_speed,
            )
        case "gptsov":
            return GPTSoVITSBackend(
                config.tts_gptsov_url,
                config.tts_gptsov_ref_audio,
                config.tts_gptsov_ref_text,
                config.tts_gptsov_ref_lang,
                config.tts_speed,
            )
        case other:
            raise ValueError(f"Unknown TTS backend: {other}")


# ---------------------------------------------------------------------------
# Streaming player (pipes audio to mpv)
# ---------------------------------------------------------------------------


class TTSPlayer:
    """Stream audio from a TTS backend through an mpv subprocess."""

    def __init__(self, backend: TTSBackend) -> None:
        self._backend = backend
        self._current_task: asyncio.Task[None] | None = None

    async def speak(self, text: str) -> None:
        proc: asyncio.subprocess.Process | None = None
        try:
            proc = await asyncio.create_subprocess_exec(
                "mpv",
                "--no-video",
                "--no-terminal",
                "--",
                "-",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            async for chunk in self._backend.synthesize_stream(text):
                if proc.stdin is not None:
                    proc.stdin.write(chunk)
                    await proc.stdin.drain()
            if proc.stdin is not None:
                proc.stdin.close()
            await proc.wait()
        except asyncio.CancelledError:
            if proc and proc.returncode is None:
                proc.kill()
                # Wait for the process to terminate after killing
                try:
                    await asyncio.wait_for(proc.wait(), timeout=2.0)
                except asyncio.TimeoutError:
                    _log.warning("tts_process_timeout", pid=proc.pid)
            raise
        except Exception as e:
            _log.warning("tts_playback_error", error=str(e))
            if proc and proc.returncode is None:
                proc.kill()
                # Wait for the process to terminate after killing
                try:
                    await asyncio.wait_for(proc.wait(), timeout=2.0)
                except asyncio.TimeoutError:
                    _log.warning("tts_process_timeout_on_error", pid=proc.pid)

    def speak_background(self, text: str) -> None:
        """Fire-and-forget: cancel current playback, start new."""
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        self._current_task = asyncio.create_task(
            self.speak(text), name="tts_playback"
        )
        self._current_task.add_done_callback(self._task_done)

    @staticmethod
    def _task_done(task: asyncio.Task[None]) -> None:
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            _log.warning("tts_task_error", error=str(exc))
