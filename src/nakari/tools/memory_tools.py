from __future__ import annotations

import json

import structlog
from nakari.llm import LLMClient
from nakari.memory import MemoryStore
from nakari.tool_registry import ToolRegistry

_log = structlog.get_logger("memory_tools")


def register_memory_tools(
    registry: ToolRegistry,
    memory: MemoryStore,
    llm: LLMClient,
) -> None:
    async def memory_query(cypher: str, params: str | None = None) -> str:
        try:
            parsed_params = json.loads(params) if params else {}
        except json.JSONDecodeError as e:
            _log.error("json_decode_error", params=params[:100] if params else "", error=str(e))
            return json.dumps({"error": f"Invalid JSON in params parameter: {e}"}, ensure_ascii=False)
        results = await memory.query(cypher, parsed_params)
        return json.dumps(results, default=str, ensure_ascii=False)

    async def memory_write(cypher: str, params: str | None = None) -> str:
        try:
            parsed_params = json.loads(params) if params else {}
        except json.JSONDecodeError as e:
            _log.error("json_decode_error", params=params[:100] if params else "", error=str(e))
            return json.dumps({"error": f"Invalid JSON in params parameter: {e}"}, ensure_ascii=False)
        results = await memory.write(cypher, parsed_params)
        return json.dumps(results, default=str, ensure_ascii=False)

    async def memory_schema() -> str:
        schema = await memory.schema()
        return json.dumps(schema, ensure_ascii=False)

    async def embedding(text: str) -> str:
        vector = await llm.embed(text)
        return json.dumps(vector)

    registry.register(
        name="memory_query",
        description="Execute a read-only Cypher query against your Neo4j memory database. Returns results as JSON.",
        parameters={
            "type": "object",
            "properties": {
                "cypher": {
                    "type": "string",
                    "description": "The Cypher query to execute (read-only: MATCH, RETURN, etc.)",
                },
                "params": {
                    "type": ["string", "null"],
                    "description": "Optional JSON string of query parameters",
                },
            },
            "required": ["cypher", "params"],
            "additionalProperties": False,
        },
        handler=memory_query,
    )

    registry.register(
        name="memory_write",
        description="Execute a write Cypher query against your Neo4j memory database. Use for CREATE, MERGE, SET, DELETE operations.",
        parameters={
            "type": "object",
            "properties": {
                "cypher": {
                    "type": "string",
                    "description": "The Cypher query to execute (write: CREATE, MERGE, SET, DELETE, etc.)",
                },
                "params": {
                    "type": ["string", "null"],
                    "description": "Optional JSON string of query parameters",
                },
            },
            "required": ["cypher", "params"],
            "additionalProperties": False,
        },
        handler=memory_write,
    )

    registry.register(
        name="memory_schema",
        description="Inspect the current structure of your memory database. Returns all labels, relationship types, and property keys.",
        parameters={
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        handler=memory_schema,
    )

    registry.register(
        name="embedding",
        description="Generate a vector embedding for the given text. Use for semantic similarity search in Neo4j.",
        parameters={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text to generate an embedding for",
                },
            },
            "required": ["text"],
            "additionalProperties": False,
        },
        handler=embedding,
    )
