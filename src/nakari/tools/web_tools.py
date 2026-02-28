from __future__ import annotations

import asyncio
import json

import aiohttp
import structlog

from nakari.config import Config
from nakari.tool_registry import ToolRegistry

log = structlog.get_logger("web_tools")

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

# Shared ClientSession for connection pooling
_http_session: aiohttp.ClientSession | None = None
_session_lock = asyncio.Lock()


async def _get_http_session() -> aiohttp.ClientSession:
    """Get or create the shared HTTP session with connection pooling."""
    global _http_session
    if _http_session is None or _http_session.closed:
        async with _session_lock:
            # Double-check after acquiring lock
            if _http_session is None or _http_session.closed:
                # Configure timeout and connection pooling
                timeout = aiohttp.ClientTimeout(total=30, connect=10)
                connector = aiohttp.TCPConnector(
                    limit=10,  # Max concurrent connections
                    limit_per_host=5,  # Max concurrent connections per host
                    ttl_dns_cache=300,  # Cache DNS for 5 minutes
                )
                _http_session = aiohttp.ClientSession(
                    timeout=timeout,
                    connector=connector,
                )
    return _http_session


async def close_http_session() -> None:
    """Close the shared HTTP session. Call during cleanup/shutdown."""
    global _http_session
    if _http_session and not _http_session.closed:
        await _http_session.close()
        _http_session = None


def register_web_tools(registry: ToolRegistry, config: Config) -> None:
    async def web_search(query: str, max_results: int = 5) -> str:
        session = await _get_http_session()
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
            "required": ["query"],
            "additionalProperties": False,
        },
        handler=web_search,
    )
