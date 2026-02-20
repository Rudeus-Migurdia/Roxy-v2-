from __future__ import annotations

import asyncio

import structlog

from nakari.context import ContextManager
from nakari.journal import JournalStore
from nakari.llm import LLMClient
from nakari.mailbox import Mailbox
from nakari.models import Event
from nakari.tool_registry import ToolRegistry


class LoopState:
    """Mutable state shared between the loop and tools."""

    def __init__(self) -> None:
        self.current_event: Event | None = None
        self.tool_call_count: int = 0

    def set_current_event(self, event: Event) -> None:
        self.current_event = event
        self.tool_call_count = 0

    def clear_current_event(self) -> None:
        self.current_event = None
        self.tool_call_count = 0


class ReactLoop:
    def __init__(
        self,
        llm: LLMClient,
        context: ContextManager,
        registry: ToolRegistry,
        state: LoopState,
        mailbox: Mailbox,
        journal: JournalStore,
    ) -> None:
        self._llm = llm
        self._context = context
        self._registry = registry
        self._state = state
        self._mailbox = mailbox
        self._journal = journal
        self._log = structlog.get_logger("loop")

    async def run(self) -> None:
        """The permanent ReAct loop. Never returns under normal operation."""
        self._log.info("react_loop_started")

        while True:
            try:
                self._context.passive_compress()

                response = await self._llm.chat(
                    messages=self._context.messages,
                    tools=self._registry.get_openai_schemas(),
                )

                choice = response.choices[0]
                message = choice.message

                # Serialize tool calls for context storage
                tool_calls_raw = None
                if message.tool_calls:
                    tool_calls_raw = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ]

                self._context.add_assistant_message(
                    content=message.content,
                    tool_calls=tool_calls_raw,
                )
                event_id = self._state.current_event.id if self._state.current_event else None
                await self._journal.log_message(
                    role="assistant",
                    content=message.content,
                    tool_calls=tool_calls_raw,
                    event_id=event_id,
                )

                if message.tool_calls:
                    for tc in message.tool_calls:
                        # Budget enforcement
                        if self._state.current_event:
                            self._state.tool_call_count += 1
                            budget = self._state.current_event.max_tool_calls
                            _BUDGET_EXEMPT = {"mailbox_done", "mailbox_list", "mailbox_wait"}
                            if self._state.tool_call_count > budget and tc.function.name not in _BUDGET_EXEMPT:
                                self._context.add_tool_result(
                                    tc.id,
                                    f"BUDGET EXCEEDED: {self._state.tool_call_count}/{budget} tool calls used. "
                                    f"You MUST call mailbox_done now.",
                                )
                                await self._journal.log_message(
                                    role="tool",
                                    content=f"BUDGET EXCEEDED: {self._state.tool_call_count}/{budget}",
                                    tool_call_id=tc.id,
                                    event_id=self._state.current_event.id if self._state.current_event else None,
                                )
                                continue

                        self._log.info("tool_call", name=tc.function.name, id=tc.id)
                        result = await self._registry.execute(
                            tc.function.name, tc.function.arguments
                        )
                        result.tool_call_id = tc.id
                        self._context.add_tool_result(tc.id, result.output)
                        await self._journal.log_message(
                            role="tool",
                            content=result.output,
                            tool_call_id=tc.id,
                            event_id=self._state.current_event.id if self._state.current_event else None,
                        )
                else:
                    # LLM returned text without tool calls — nudge it
                    self._log.warning(
                        "no_tool_calls",
                        content=(message.content or "")[:100],
                    )
                    nudge = (
                        "You must use tools to take actions. "
                        "Use mailbox_list to see your queue, mailbox_pick to start an event, "
                        "mailbox_done when finished, or mailbox_wait if idle. "
                        "Do not output text without tool calls."
                    )
                    self._context.add_user_message(nudge)
                    await self._journal.log_message(
                        role="user",
                        content=nudge,
                        event_id=self._state.current_event.id if self._state.current_event else None,
                    )

            except Exception as e:
                self._log.error("loop_error", error=str(e), exc_info=True)
                error_msg = f"[System Error] An error occurred: {e}. Please continue."
                self._context.add_user_message(error_msg)
                await self._journal.log_message(
                    role="user",
                    content=error_msg,
                    event_id=self._state.current_event.id if self._state.current_event else None,
                )
                await asyncio.sleep(1)
