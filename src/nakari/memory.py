from __future__ import annotations

from typing import Any

import structlog
from neo4j import AsyncGraphDatabase, AsyncDriver

from nakari.config import Config


class MemoryStore:
    def __init__(self, config: Config) -> None:
        self._driver: AsyncDriver | None = None
        self._config = config
        self._log = structlog.get_logger("memory")

    async def connect(self) -> None:
        self._driver = AsyncGraphDatabase.driver(
            self._config.neo4j_uri,
            auth=(self._config.neo4j_user, self._config.neo4j_password),
        )
        await self._driver.verify_connectivity()
        self._log.info("neo4j_connected", uri=self._config.neo4j_uri)

    async def close(self) -> None:
        if self._driver:
            await self._driver.close()

    async def query(self, cypher: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        assert self._driver is not None, "MemoryStore not connected"
        async with self._driver.session() as session:
            result = await session.run(cypher, params or {})
            records = [record.data() async for record in result]
            return records

    async def write(self, cypher: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        assert self._driver is not None, "MemoryStore not connected"
        async with self._driver.session() as session:
            result = await session.run(cypher, params or {})
            records = [record.data() async for record in result]
            return records

    async def schema(self) -> dict[str, list[str]]:
        labels = await self.query("CALL db.labels() YIELD label RETURN label")
        rel_types = await self.query(
            "CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType"
        )
        prop_keys = await self.query(
            "CALL db.propertyKeys() YIELD propertyKey RETURN propertyKey"
        )
        return {
            "labels": [r["label"] for r in labels],
            "relationship_types": [r["relationshipType"] for r in rel_types],
            "property_keys": [r["propertyKey"] for r in prop_keys],
        }
