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

    def _safe_serialize(self, obj: Any) -> str:
        """安全地序列化对象为JSON字符串，处理不可序列化的对象

        Args:
            obj: 要序列化的对象

        Returns:
            序列化后的JSON字符串，或在序列化失败时的错误消息
        """
        if isinstance(obj, str):
            return obj

        try:
            return json.dumps(obj, default=str, ensure_ascii=False)
        except (TypeError, ValueError) as e:
            self._log.warning("serialization_failed", error=str(e), type=type(obj).__name__)
            # 返回一个包含错误信息的序列化对象
            error_info = {
                "error": "Serialization failed",
                "message": str(e),
                "type": type(obj).__name__,
                "raw_repr": repr(obj)[:200]  # 限制长度
            }
            return json.dumps(error_info, ensure_ascii=False)

    async def execute(self, name: str, arguments_json: str) -> ToolResult:
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(
                tool_call_id="",
                output=f"Unknown tool: {name}",
                is_error=True,
            )

        try:
            # 解析JSON参数
            args = json.loads(arguments_json) if arguments_json else {}
        except json.JSONDecodeError as e:
            self._log.error("json_decode_error", tool=name, json=arguments_json[:200] if arguments_json else "")
            return ToolResult(
                tool_call_id="",
                output=f"Invalid JSON arguments for {name}: {e}",
                is_error=True,
            )

        try:
            # 执行工具处理器
            result = await tool.handler(**args)

            # 安全地序列化结果
            serialized_result = self._safe_serialize(result)

            return ToolResult(
                tool_call_id="",
                output=serialized_result,
            )
        except json.JSONDecodeError as e:
            # 处理处理器内部可能产生的JSON错误
            self._log.error("handler_json_error", tool=name, error=str(e))
            return ToolResult(
                tool_call_id="",
                output=f"JSON error in {name} handler: {e}",
                is_error=True,
            )
        except Exception as e:
            # 处理其他所有异常
            self._log.error("tool_execution_error", tool=name, error=str(e), exc_info=True)
            return ToolResult(
                tool_call_id="",
                output=f"Error executing {name}: {str(e)[:200]}",  # 限制错误消息长度
                is_error=True,
            )
