from __future__ import annotations

from typing import Any

import structlog
import tiktoken

from nakari.config import Config


class ContextManager:
    def __init__(self, config: Config) -> None:
        self._messages: list[dict[str, Any]] = []
        self._config = config
        try:
            self._encoder = tiktoken.encoding_for_model(config.openai_model)
        except KeyError:
            self._encoder = tiktoken.get_encoding("cl100k_base")
        self._log = structlog.get_logger("context")

    @property
    def messages(self) -> list[dict[str, Any]]:
        return self._messages

    def set_system_prompt(self, prompt: str) -> None:
        if self._messages and self._messages[0]["role"] == "system":
            self._messages[0] = {"role": "system", "content": prompt}
        else:
            self._messages.insert(0, {"role": "system", "content": prompt})

    def add_assistant_message(
        self,
        content: str | None,
        tool_calls: list[dict[str, Any]] | None = None,
    ) -> None:
        msg: dict[str, Any] = {"role": "assistant"}
        if content:
            msg["content"] = content
        if tool_calls:
            msg["tool_calls"] = tool_calls
        self._messages.append(msg)

    def add_tool_result(self, tool_call_id: str, content: str) -> None:
        self._messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": content,
        })

    def add_user_message(self, content: str) -> None:
        self._messages.append({"role": "user", "content": content})

    def count_tokens(self) -> int:
        total = 0
        for msg in self._messages:
            total += 4  # message overhead
            content = msg.get("content", "")
            if isinstance(content, str):
                total += len(self._encoder.encode(content))
            if "tool_calls" in msg:
                for tc in msg["tool_calls"]:
                    fn = tc.get("function", {})
                    total += len(self._encoder.encode(fn.get("name", "")))
                    total += len(self._encoder.encode(fn.get("arguments", "")))
        return total

    def passive_compress(self) -> None:
        token_count = self.count_tokens()
        if token_count <= self._config.context_max_tokens:
            return

        self._log.info(
            "passive_compression_triggered",
            tokens=token_count,
            threshold=self._config.context_max_tokens,
        )

        while (
            self.count_tokens() > self._config.context_target_tokens
            and len(self._messages) > 2
        ):
            removed = self._messages.pop(1)
            # If we removed an assistant message with tool_calls,
            # also remove orphaned tool results
            if removed.get("role") == "assistant" and removed.get("tool_calls"):
                call_ids = {tc["id"] for tc in removed["tool_calls"]}
                # Filter out orphaned tool results
                # Keep system message (index 0) and all messages not referencing removed tool calls
                self._messages = [
                    m
                    for m in self._messages
                    if m.get("role") == "system" or m.get("tool_call_id") not in call_ids
                ]

        self._log.info("passive_compression_done", tokens=self.count_tokens())

    def active_compress(self, summary: str) -> None:
        system = (
            self._messages[0]
            if self._messages and self._messages[0]["role"] == "system"
            else None
        )
        self._messages.clear()
        if system:
            self._messages.append(system)
        self._messages.append({
            "role": "user",
            "content": f"[Context Summary]\n{summary}",
        })
        self._log.info("active_compression_done", tokens=self.count_tokens())

    def get_recent_context_text(self) -> str:
        parts: list[str] = []
        for msg in self._messages[1:]:  # skip system
            role = msg.get("role", "?")
            content = msg.get("content", "")
            if content:
                parts.append(f"[{role}] {content}")
        return "\n".join(parts)
