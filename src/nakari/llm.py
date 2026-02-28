from __future__ import annotations

from typing import Any

import structlog
from openai import AsyncOpenAI, Timeout
from openai.types.chat import ChatCompletion

from nakari.config import Config


class LLMClient:
    def __init__(self, config: Config) -> None:
        # Configure timeout: 60s for connect, 120s for read, 10s for write
        # This prevents requests from hanging indefinitely
        self._timeout = Timeout(60.0, connect=120.0, write=10.0)
        self._client = AsyncOpenAI(
            api_key=config.openai_api_key,
            base_url=config.openai_base_url,
            timeout=self._timeout,
        )
        self._model = config.openai_model
        self._embedding_model = config.embedding_model
        self._log = structlog.get_logger("llm")

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> ChatCompletion:
        self._log.info("llm_request", message_count=len(messages), model=self._model)
        try:
            if tools:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    timeout=self._timeout,
                )
            else:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    timeout=self._timeout,
                )
            self._log.debug(
                "llm_response",
                finish_reason=response.choices[0].finish_reason,
            )
            return response
        except Exception as e:
            self._log.error("llm_request_failed", error=str(e))
            raise

    async def embed(self, text: str) -> list[float]:
        try:
            response = await self._client.embeddings.create(
                model=self._embedding_model,
                input=text,
                timeout=self._timeout,
            )
            return response.data[0].embedding
        except Exception as e:
            self._log.error("llm_embed_failed", error=str(e))
            raise
