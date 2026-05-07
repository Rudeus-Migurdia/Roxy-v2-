from __future__ import annotations

import pytest

from nakari.journal import JournalStore


@pytest.mark.asyncio
async def test_switch_session_moves_subsequent_writes(tmp_path) -> None:
    journal = JournalStore()
    await journal.connect(str(tmp_path / "journal.db"))
    try:
        first_session_id = await journal.start_session()
        second_session_id = await journal.start_session()

        await journal.switch_session(first_session_id)
        await journal.log_message(role="user", content="back to first")

        first_messages = await journal.read_session(first_session_id)
        second_messages = await journal.read_session(second_session_id)

        assert journal.session_id == first_session_id
        assert [message["content"] for message in first_messages] == ["back to first"]
        assert second_messages == []
    finally:
        await journal.close()


@pytest.mark.asyncio
async def test_delete_active_session_clears_current_session(tmp_path) -> None:
    journal = JournalStore()
    await journal.connect(str(tmp_path / "journal.db"))
    try:
        session_id = await journal.start_session()

        assert await journal.delete_session(session_id) is True
        assert journal.session_id is None

        await journal.log_message(role="user", content="orphan candidate")
        messages = await journal.query("SELECT * FROM messages")

        assert messages == []
    finally:
        await journal.close()


@pytest.mark.asyncio
async def test_session_mutations_report_missing_sessions(tmp_path) -> None:
    journal = JournalStore()
    await journal.connect(str(tmp_path / "journal.db"))
    try:
        assert await journal.set_session_title("missing", "Title") is False
        assert await journal.delete_session("missing") is False
    finally:
        await journal.close()
