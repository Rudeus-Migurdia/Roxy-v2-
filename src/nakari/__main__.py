from __future__ import annotations

import asyncio

import structlog

from nakari.cli import CLI
from nakari.config import Config
from nakari.context import ContextManager
from nakari.frontend_adapter.output import MultiOutputHandler
from nakari.journal import JournalStore
from nakari.llm import LLMClient
from nakari.loop import LoopState, ReactLoop
from nakari.mailbox import Mailbox
from nakari.memory import MemoryStore
from nakari.models import Event, EventType
from nakari.prompt import SYSTEM_PROMPT
from nakari.tool_registry import ToolRegistry
from nakari.tools.asr_tools import register_asr_tools
from nakari.tools.context_tools import register_context_tools
from nakari.tools.journal_tools import register_journal_tools
from nakari.tools.mailbox_tools import register_mailbox_tools
from nakari.tools.memory_tools import register_memory_tools
from nakari.tools.reply_tool import register_reply_tool
from nakari.tools.timer_tools import register_timer_tools
from nakari.tools.web_tools import register_web_tools
from nakari.timer import TimerStore, run_timer_loop
from nakari.tts import TTSPlayer, create_tts_backend


async def run() -> None:
    config = Config.from_env()

    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(config.log_level),
    )
    log = structlog.get_logger("main")

    # Core components
    mailbox = Mailbox()
    llm = LLMClient(config)
    memory = MemoryStore(config)
    journal = JournalStore()
    context = ContextManager(config)
    context.set_system_prompt(SYSTEM_PROMPT)
    loop_state = LoopState()
    registry = ToolRegistry()
    cli = CLI(mailbox, config)

    # Connect to Neo4j (optional — skip if not configured)
    try:
        await memory.connect()
    except Exception as e:
        log.warning("neo4j_unavailable", error=str(e))

    # Journal (SQLite conversation log)
    await journal.connect(config.journal_db_path)
    await journal.start_session()

    # Inject journal into API routes (if enabled later)
    if config.api_enabled:
        # Import routes here and inject journal
        from nakari.api import routes as api_routes
        api_routes._journal_store = journal

    # Timer (SQLite persistent timers)
    timer_store = TimerStore()
    await timer_store.connect(config.timer_db_path)

    # TTS
    tts_backend = create_tts_backend(config)
    tts_player = TTSPlayer(tts_backend)

    # Live2D / API integration (conditional)
    multi_output_handler = None
    state_emitter = None
    ws_input = None
    shutdown_event = asyncio.Event()

    # Helper function for delayed shutdown
    async def _delayed_shutdown(event: asyncio.Event, delay_seconds: int) -> None:
        """Wait for delay seconds before setting shutdown event."""
        try:
            await asyncio.sleep(delay_seconds)
            log.info("shutdown_delay_completed")
            event.set()
        except asyncio.CancelledError:
            log.info("shutdown_delay_canceled")

    if config.api_enabled:
        from nakari.api import get_ws_manager, run_api_server
        from nakari.api import app as api_app
        from nakari.api.websocket import WebSocketManager
        from nakari.frontend_adapter.audio_interceptor import AudioBroadcaster, wrap_tts_backend
        from nakari.frontend_adapter.input import WebSocketInput
        from nakari.frontend_adapter.output import CLIOutput, WebSocketOutput
        from nakari.frontend_adapter.state_emitter import StateEmitter
        from nakari.tools.live2d_tools import register_live2d_tools

        log.info("live2d_api_enabled", host=config.api_host, port=config.api_port)

        # Track shutdown task for cancellation on reconnect
        shutdown_task: asyncio.Task[None] | None = None

        # Create shutdown callback for auto-shutdown on last client disconnect
        async def on_last_client_disconnect() -> None:
            nonlocal shutdown_task
            if config.auto_shutdown_on_disconnect:
                log.info(
                    "last_client_disconnected_scheduling_shutdown",
                    delay_seconds=config.auto_shutdown_delay_seconds,
                )
                # Schedule shutdown after delay
                shutdown_task = asyncio.create_task(
                    _delayed_shutdown(shutdown_event, config.auto_shutdown_delay_seconds)
                )

        # Create callback for client connect to cancel pending shutdown
        async def on_client_connect() -> None:
            nonlocal shutdown_task
            if shutdown_task and not shutdown_task.done():
                log.info("client_connected_canceling_shutdown")
                shutdown_task.cancel()
                shutdown_task = None

        # Get WebSocket manager with shutdown callbacks
        ws_manager: WebSocketManager = get_ws_manager(
            on_last_client_disconnect=on_last_client_disconnect,
            on_client_connect=on_client_connect,
        )

        # Create multi-output handler
        multi_output_handler = MultiOutputHandler()
        multi_output_handler.register(CLIOutput())  # Always support CLI output
        multi_output_handler.register(WebSocketOutput(ws_manager))  # Also to WebSocket

        # Create state emitter for Live2D control
        state_emitter = StateEmitter(ws_manager)

        # Create audio broadcaster and wrap TTS backend
        audio_broadcaster = AudioBroadcaster(ws_manager)
        tts_backend = wrap_tts_backend(tts_backend, audio_broadcaster)
        tts_player = TTSPlayer(tts_backend)

        # Create WebSocket input handler
        ws_input = WebSocketInput(mailbox, config, journal)

        # Set ws_input in api_app module so websocket_endpoint can use it
        api_app.ws_input = ws_input

    # Register all tools
    register_mailbox_tools(registry, mailbox, loop_state, config)
    register_reply_tool(registry, cli.print_reply, tts_player, multi_output_handler, state_emitter)
    register_memory_tools(registry, memory, llm)
    register_context_tools(registry, context, llm)
    register_asr_tools(registry, config)
    register_journal_tools(registry, journal)
    register_timer_tools(registry, timer_store)

    # Register Live2D tools if API is enabled
    if state_emitter is not None:
        register_live2d_tools(registry, state_emitter)

    if config.tavily_api_key:
        register_web_tools(registry, config)

    # ReAct loop
    react_loop = ReactLoop(llm, context, registry, loop_state, mailbox, journal)

    # Seed event to bootstrap the loop
    await mailbox.put(
        Event(
            type=EventType.SYSTEM,
            content="System started. You are now active. Call mailbox_list to see your queue.",
            max_tool_calls=5,
        )
    )

    log.info("nakari_starting")
    print("\033[36mnakari is awake. Type something to talk.\033[0m", flush=True)

    try:
        async with asyncio.TaskGroup() as tg:
            # Create a task that waits for shutdown event
            async def wait_for_shutdown() -> None:
                await shutdown_event.wait()
                log.info("shutdown_event_triggered_canceling_tasks")
                # Cancel all tasks by raising SystemExit in the TaskGroup
                raise SystemExit("Auto-shutdown triggered")

            tg.create_task(wait_for_shutdown(), name="shutdown_watcher")
            tg.create_task(react_loop.run(), name="react_loop")
            tg.create_task(cli.input_loop(), name="cli_input")
            tg.create_task(
                run_timer_loop(timer_store, mailbox, config.timer_check_interval_seconds),
                name="timer_loop",
            )

            # API server (optional)
            if config.api_enabled:
                async def run_api_server_safe() -> None:
                    """Run API server with error handling."""
                    try:
                        await run_api_server(config.api_host, config.api_port, config.log_level)
                    except Exception as e:
                        log.error("api_server_failed", error=str(e))
                        # Don't re-raise - nakari should continue running without API

                tg.create_task(
                    run_api_server_safe(),
                    name="api_server",
                )
    except* SystemExit:
        log.info("nakari_shutting_down")
    except* KeyboardInterrupt:
        log.info("nakari_interrupted")
    finally:
        await timer_store.close()
        await journal.close()
        await memory.close()


def main() -> None:
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
