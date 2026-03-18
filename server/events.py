"""
Event system for streaming agent progress to the dashboard.

Events are plain dicts with 'type' and 'timestamp' keys.
The EventEmitter dispatches to registered callbacks.
"""

import time
from typing import Any, Callable

# Event type constants
AGENT_STARTED = "agent_started"
AGENT_FINISHED = "agent_finished"
TURN_STARTED = "turn_started"
PLAN_CREATED = "plan_created"
TASK_UPDATED = "task_updated"
SEARCH_INITIATED = "search_initiated"
SEARCH_COMPLETED = "search_completed"
TOOL_CALLED = "tool_called"
TOOL_RESULT = "tool_result"
SCRATCHPAD_SAVED = "scratchpad_saved"
TEXT_GENERATED = "text_generated"
USAGE_TRACKED = "usage_tracked"
EXIT_GATE_TRIGGERED = "exit_gate_triggered"
API_ERROR = "api_error"
REPORT_READY = "report_ready"
REPORT_ERROR = "report_error"


EventCallback = Callable[[dict[str, Any]], None]


class EventEmitter:
    def __init__(self):
        self._callbacks: list[EventCallback] = []

    def on(self, callback: EventCallback):
        self._callbacks.append(callback)

    def emit(self, event_type: str, data: dict[str, Any] | None = None):
        event = {"type": event_type, "timestamp": time.time(), **(data or {})}
        for cb in self._callbacks:
            try:
                cb(event)
            except Exception:
                pass  # Don't let a bad callback crash the agent
