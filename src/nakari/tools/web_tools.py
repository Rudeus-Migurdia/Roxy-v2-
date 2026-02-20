from __future__ import annotations

import json

import aiohttp
import structlog

from nakari.config import Config
from nakari.tool_registry import ToolRegistry

log = structlog.get_logger("web_tools")

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def register_web_tools(registry: ToolRegistry, config: Config) -> None:
    async def web_search(query: str, max_results: int = 5) -> str:
        async with aiohttp.ClientSession() as session:
            payload = {
                "query": query,
                "max_results": max_results,
                "api_key": config.tavily_api_key,
            }
            async with session.post(TAVILY_SEARCH_URL, json=payload) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    log.error("tavily_search_failed", status=resp.status, body=body)
                    return json.dumps(
                        {"error": f"Tavily API returned {resp.status}: {body}"},
                        ensure_ascii=False,
                    )
                data = await resp.json()

        results = [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
                "score": r.get("score", 0),
            }
            for r in data.get("results", [])
        ]
        return json.dumps(results, ensure_ascii=False)

    registry.register(
        name="web_search",
        description="Search the web using Tavily. Returns a list of results with title, url, content snippet, and relevance score.",
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (1-10, default 5)",
                },
            },
            "required": ["query", "max_results"],
            "additionalProperties": False,
        },
        handler=web_search,
    )
