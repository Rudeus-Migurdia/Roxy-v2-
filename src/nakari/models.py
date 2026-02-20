from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class EventType(str, Enum):
    USER_TEXT = "user_text"
    ASR_TRANSCRIPT = "asr_transcript"
    TIMER = "timer"
    SELF_CREATED = "self_created"
    SYSTEM = "system"


class EventStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    SUSPENDED = "suspended"


@dataclass
class Attachment:
    mime_type: str
    uri: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Event:
    type: EventType
    content: str
    attachments: list[Attachment] = field(default_factory=list)
    max_tool_calls: int = 30
    priority: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    created_at: float = field(default_factory=time.time)
    status: EventStatus = EventStatus.PENDING
    suspend_notes: str | None = None


@dataclass
class ToolResult:
    tool_call_id: str
    output: str
    is_error: bool = False
