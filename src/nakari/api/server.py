"""API server runner for nakari Live2D integration.

Provides the server startup function that integrates with nakari's
main async loop.
"""

from __future__ import annotations

import asyncio

import structlog
import uvicorn

from nakari.api.app import create_app

_log = structlog.get_logger("api_server")


async def run_api_server(
    host: str = "127.0.0.1",
    port: int = 8000,
    log_level: str = "info",
) -> None:
    """Run the FastAPI server.

    This function runs the API server in a way that's compatible
    with nakari's asyncio.TaskGroup-based architecture.

    Args:
        host: Host to bind to
        port: Port to bind to
        log_level: Logging level
    """
    app = create_app()

    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level=log_level,
    )
    server = uvicorn.Server(config)

    _log.info("api_server_starting", host=host, port=port)

    try:
        await server.serve()
    except asyncio.CancelledError:
        _log.info("api_server_cancelled")
        await server.shutdown()
    except Exception as e:
        _log.error("api_server_error", error=str(e), exc_info=True)
        raise
    finally:
        _log.info("api_server_stopped")
