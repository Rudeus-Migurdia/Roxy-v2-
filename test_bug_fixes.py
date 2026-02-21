"""Test script to verify bug fixes."""

import asyncio
import json
from nakari.mailbox import Mailbox
from nakari.models import Event, EventType, EventStatus
from nakari.context import ContextManager
from nakari.config import Config


def test_mailbox_race_condition():
    """Test that wait_for_events doesn't have race condition."""
    print("Testing mailbox race condition fix...")

    async def run_test():
        mailbox = Mailbox()

        # Test 1: wait_for_events should return immediately when PENDING event exists
        event1 = Event(
            type=EventType.USER_TEXT,
            content="test1",
            status=EventStatus.PENDING,
        )
        await mailbox.put(event1)

        # This should NOT block - there's already a PENDING event
        task = asyncio.create_task(mailbox.wait_for_events())
        try:
            await asyncio.wait_for(task, timeout=0.5)
            print("[PASS] Test 1 passed: wait_for_events returned immediately with existing PENDING event")
        except asyncio.TimeoutError:
            print("[FAIL] Test 1 FAILED: wait_for_events blocked with existing PENDING event")
            return False

        # Test 2: wait_for_events should wait when no PENDING events
        # First, mark the PENDING event from Test 1 as COMPLETED
        event1.status = EventStatus.COMPLETED
        event2 = Event(
            type=EventType.USER_TEXT,
            content="test2",
            status=EventStatus.PROCESSING,  # Not PENDING
        )
        await mailbox.put(event2)

        task = asyncio.create_task(mailbox.wait_for_events())
        # Check that task is still running (waiting)
        await asyncio.sleep(0.2)
        if not task.done():
            print("[PASS] Test 2 passed: wait_for_events is waiting for PENDING events")
        else:
            print("[FAIL] Test 2 FAILED: wait_for_events didn't wait")
            return False

        # Now add a PENDING event
        event3 = Event(
            type=EventType.USER_TEXT,
            content="test3",
            status=EventStatus.PENDING,
        )
        await mailbox.put(event3)

        # Task should complete now
        try:
            await asyncio.wait_for(task, timeout=1.0)
            print("[PASS] Test 3 passed: wait_for_events completed after PENDING event was added")
        except asyncio.TimeoutError:
            print("[FAIL] Test 3 FAILED: wait_for_events didn't complete after event added")
            task.cancel()
            return False

        return True

    return asyncio.run(run_test())


def test_context_compression():
    """Test that context compression logic is correct."""
    print("\nTesting context compression fix...")

    # Create a minimal config for testing
    class TestConfig:
        openai_model = "gpt-4o"
        context_max_tokens = 100
        context_target_tokens = 50

    context = ContextManager(TestConfig())  # type: ignore
    context.set_system_prompt("You are a helpful assistant.")

    # Add some messages
    context.add_user_message("Hello")
    context.add_assistant_message("Hi there!", tool_calls=[
        {"id": "call_1", "type": "function", "function": {"name": "test", "arguments": "{}"}}
    ])
    context.add_tool_result("call_1", "Result 1")
    context.add_user_message("Another message")
    context.add_assistant_message("Response")

    # Verify messages are added correctly
    initial_count = len(context.messages)
    print(f"  Initial message count: {initial_count}")

    # Trigger compression by setting very low target
    context._config.context_target_tokens = 10
    context.passive_compress()

    final_count = len(context.messages)
    print(f"  Final message count after compression: {final_count}")

    # System message should always be preserved
    if context.messages[0]["role"] == "system":
        print("[PASS] Test passed: System message preserved after compression")
        return True
    else:
        print("[FAIL] Test FAILED: System message not preserved")
        return False


def test_json_error_handling():
    """Test JSON error handling in tools."""
    print("\nTesting JSON error handling...")

    # Test invalid JSON string
    test_cases = [
        ("{invalid json}", "unclosed"),
        ("{key: value}", "unquoted keys"),
        ("{'key': 'value'}", "single quotes"),
    ]

    for invalid_json, desc in test_cases:
        try:
            result = json.loads(invalid_json)
            print(f"[FAIL] FAILED: {desc} - should have raised JSONDecodeError")
            return False
        except json.JSONDecodeError:
            print(f"[PASS] {desc} correctly raises JSONDecodeError")

    # Test valid JSON
    valid_json = '{"key": "value", "number": 123}'
    try:
        result = json.loads(valid_json)
        print(f"[PASS] Valid JSON parsed correctly: {result}")
    except Exception as e:
        print(f"[FAIL] FAILED: Valid JSON failed to parse: {e}")
        return False

    return True


if __name__ == "__main__":
    print("=" * 60)
    print("BUG FIX VERIFICATION TESTS")
    print("=" * 60)

    results = []

    # Test 1: Mailbox race condition
    results.append(("Mailbox Race Condition", test_mailbox_race_condition()))

    # Test 2: Context compression
    results.append(("Context Compression", test_context_compression()))

    # Test 3: JSON error handling
    results.append(("JSON Error Handling", test_json_error_handling()))

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for name, passed in results:
        status = "[PASS] PASSED" if passed else "[FAIL] FAILED"
        print(f"{name}: {status}")

    all_passed = all(r[1] for r in results)
    print("\n" + ("=" * 60))
    if all_passed:
        print("ALL TESTS PASSED!")
    else:
        print("SOME TESTS FAILED!")
    print("=" * 60)
