"""
Agent runner — wraps agent.py in a thread and bridges events to asyncio.Queue.
"""

import asyncio
import threading
import uuid
from dataclasses import dataclass, field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import run as agent_run, generate_reports, AgentState


@dataclass
class RunState:
    run_id: str
    company: str
    thread: threading.Thread | None = None
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    agent_state: AgentState | None = None
    finished: bool = False
    report: dict | None = None
    report_paths: dict = field(default_factory=dict)


class AgentRunner:
    def __init__(self):
        self._runs: dict[str, RunState] = {}

    def start_run(self, company: str, loop: asyncio.AbstractEventLoop, pitch_context: str | None = None) -> str:
        run_id = uuid.uuid4().hex[:12]
        run_state = RunState(run_id=run_id, company=company)
        self._runs[run_id] = run_state

        def event_callback(event: dict):
            try:
                loop.call_soon_threadsafe(run_state.queue.put_nowait, event)
            except RuntimeError:
                pass

            if event.get("type") == "report_ready":
                run_state.report = event.get("report")
                run_state.report_paths = {
                    "xlsx": event.get("xlsx_path", ""),
                    "csv": event.get("csv_path", ""),
                    "json": event.get("json_path", ""),
                }

        def run_agent():
            try:
                state = agent_run(company, max_turns=50, event_callback=event_callback, pitch_context=pitch_context)
                run_state.agent_state = state
                generate_reports(state, company, event_callback=event_callback)
            except Exception as e:
                try:
                    loop.call_soon_threadsafe(
                        run_state.queue.put_nowait,
                        {"type": "api_error", "error": str(e), "will_retry": False, "fatal": True}
                    )
                except RuntimeError:
                    pass
            finally:
                run_state.finished = True
                try:
                    loop.call_soon_threadsafe(
                        run_state.queue.put_nowait,
                        {"type": "__done__"}
                    )
                except RuntimeError:
                    pass

        thread = threading.Thread(target=run_agent, daemon=True)
        run_state.thread = thread
        thread.start()

        return run_id

    def get_run(self, run_id: str) -> RunState | None:
        return self._runs.get(run_id)

    def list_runs(self) -> list[dict]:
        return [
            {"run_id": rs.run_id, "company": rs.company, "finished": rs.finished}
            for rs in self._runs.values()
        ]
