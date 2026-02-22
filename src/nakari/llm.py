from __future__ import annotations

from typing import Any

import structlog
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion

from nakari.config import Config


class LLMClient:
    def __init__(self, config: Config) -> None:
        self._client = AsyncOpenAI(
            api_key=config.openai_api_key,
            base_url=config.openai_base_url,
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
        if tools:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
            )
        else:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
            )
        self._log.debug(
            "llm_response",
            finish_reason=response.choices[0].finish_reason,
        )
        return response

    async def embed(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(
            model=self._embedding_model,
            input=text,
        )
        return response.data[0].embedding
