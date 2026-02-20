from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable

import structlog

from nakari.models import ToolResult


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[..., Any]


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}
        self._log = structlog.get_logger("tools")

    def register(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        handler: Callable[..., Any],
    ) -> None:
        self._tools[name] = ToolDefinition(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler,
        )
        self._log.debug("tool_registered", name=name)

    def get_openai_schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                    "strict": True,
                },
            }
            for tool in self._tools.values()
        ]

    async def execute(self, name: str, arguments_json: str) -> ToolResult:
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(
                tool_call_id="",
                output=f"Unknown tool: {name}",
                is_error=True,
            )

        try:
            args = json.loads(arguments_json) if arguments_json else {}
            result = await tool.handler(**args)
            return ToolResult(
                tool_call_id="",
                output=result if isinstance(result, str) else json.dumps(result, default=str, ensure_ascii=False),
            )
        except Exception as e:
            self._log.error("tool_execution_error", tool=name, error=str(e))
            return ToolResult(
                tool_call_id="",
                output=f"Error executing {name}: {e}",
                is_error=True,
            )
