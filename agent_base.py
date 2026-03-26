"""
Chicago Intelligence Company — Shared Agent Primitives

Reusable dataclasses, tool definitions, tool execution, and display helpers
shared across agent implementations.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Any, Callable

# ─── Directories ─────────────────────────────────────────
SCRATCHPAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scratchpad")
REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")

# ─── Type aliases ────────────────────────────────────────
EventCallback = Callable[[dict[str, Any]], None] | None

# ─── State ───────────────────────────────────────────────

@dataclass
class Todo:
    task: str
    status: str = "pending"

@dataclass
class AgentState:
    todos: list[Todo] = field(default_factory=list)
    scratchpad: dict[str, str] = field(default_factory=dict)
    messages: list[dict] = field(default_factory=list)
    turn: int = 0
    total_searches: int = 0
    total_tokens: int = 0


# ─── Custom tool definitions (client-side) ───────────────

CUSTOM_TOOLS = [
    {
        "name": "todo_write",
        "description": (
            "Create the research plan. Call this FIRST before doing anything else. "
            "Break the analysis into 5-8 concrete research tasks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tasks": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of research task descriptions"
                }
            },
            "required": ["tasks"]
        }
    },
    {
        "name": "todo_update",
        "description": (
            "Update task status. Mark in_progress when starting a task, "
            "completed when done. The agent loop will not exit until all tasks "
            "are completed or blocked."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "index": {"type": "integer", "description": "0-based task index"},
                "status": {
                    "type": "string",
                    "enum": ["pending", "in_progress", "completed", "blocked"]
                }
            },
            "required": ["index", "status"]
        }
    },
    {
        "name": "write_scratchpad",
        "description": (
            "Save research findings to a named file in the scratchpad workspace. "
            "Use .md for intermediate research, .json for the final structured report. "
            "The final report MUST be saved as 'final_report.json' with the full "
            "structured VC analysis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "e.g. company_research.md"},
                "content": {"type": "string", "description": "Content to save"}
            },
            "required": ["filename", "content"]
        }
    },
    {
        "name": "read_scratchpad",
        "description": "Read a previously saved scratchpad file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string"}
            },
            "required": ["filename"]
        }
    },
]


# ─── Pinned plan message ─────────────────────────────────

def build_plan_message(state: AgentState) -> str:
    """
    Returns the plan text that gets PINNED into the system prompt
    on every iteration. This never drifts into history noise.
    """
    if not state.todos:
        return (
            "\n\n[CURRENT PLAN]\n"
            "No plan created yet. Your FIRST action must be to call "
            "todo_write to create your research plan.\n"
        )

    lines = []
    for i, t in enumerate(state.todos):
        if t.status == "completed":
            mark = "x"
        elif t.status == "in_progress":
            mark = ">"
        elif t.status == "blocked":
            mark = "!"
        else:
            mark = " "
        lines.append(f"  [{mark}] {i+1}. {t.task}")

    done = sum(1 for t in state.todos if t.status == "completed")
    total = len(state.todos)

    current = next((t.task for t in state.todos if t.status == "in_progress"), None)
    pointer = f"\nCurrent task: {current}" if current else ""

    files = list(state.scratchpad.keys())
    files_str = f"\nScratchpad files: {', '.join(files)}" if files else ""

    return (
        f"\n\n[PLAN — {done}/{total} complete]"
        f"\n{chr(10).join(lines)}"
        f"{pointer}{files_str}\n"
        f"Follow this plan sequentially. Mark tasks in_progress when starting, "
        f"completed when done. Do not skip tasks."
    )


# ─── Tool execution (client-side only) ───────────────────

def execute_tool(name: str, inp: dict, state: AgentState, emit=None) -> str:
    """Execute a client-side tool. Returns result string with re-injected instructions."""

    if name == "todo_write":
        state.todos = [Todo(task=t) for t in inp["tasks"]]
        if emit:
            emit("plan_created", {
                "tasks": [{"index": i, "task": t, "status": "pending"} for i, t in enumerate(inp["tasks"])]
            })
        return (
            f"Plan created with {len(state.todos)} tasks.\n\n"
            "[NEXT] Mark the first task as in_progress and begin working on it. "
            "Use web_search to research, write_scratchpad to save findings."
        )

    if name == "todo_update":
        idx = inp["index"]
        status = inp["status"]
        if 0 <= idx < len(state.todos):
            old_status = state.todos[idx].status
            state.todos[idx].status = status
            done = sum(1 for t in state.todos if t.status == "completed")
            total = len(state.todos)
            if emit:
                emit("task_updated", {
                    "index": idx,
                    "task": state.todos[idx].task,
                    "old_status": old_status,
                    "status": status,
                    "done_count": done,
                    "total_count": total,
                })
            msg = f"Task {idx+1} → {status}"

            if status == "completed":
                nxt = next((i for i, t in enumerate(state.todos) if t.status == "pending"), None)
                if nxt is not None:
                    msg += (
                        f"\n\n[NEXT] Move to task {nxt+1}: "
                        f"'{state.todos[nxt].task}'. Mark it in_progress and begin."
                    )
                else:
                    all_done = all(t.status in ("completed", "blocked") for t in state.todos)
                    if all_done:
                        msg += (
                            "\n\n[NEXT] All tasks complete. Provide your final summary "
                            "and stop calling tools."
                        )
                    else:
                        msg += "\n\n[NEXT] Check remaining tasks and continue."
            return msg
        return f"Invalid index: {idx}"

    if name == "write_scratchpad":
        fn = inp["filename"]
        content = inp["content"]
        state.scratchpad[fn] = content
        path = os.path.join(SCRATCHPAD_DIR, fn)
        with open(path, "w") as f:
            f.write(content)
        if emit:
            emit("scratchpad_saved", {
                "filename": fn,
                "char_count": len(content),
                "content": content,
            })
        return (
            f"Saved {len(content):,} chars → scratchpad/{fn}\n\n"
            "[NEXT] Update your todo status and continue with the next task."
        )

    if name == "read_scratchpad":
        fn = inp["filename"]
        if fn in state.scratchpad:
            return state.scratchpad[fn]
        path = os.path.join(SCRATCHPAD_DIR, fn)
        if os.path.exists(path):
            with open(path) as f:
                return f.read()
        return f"File not found: {fn}"

    return f"Unknown tool: {name}"


# ─── Display helpers ──────────────────────────────────────

def display_plan(state: AgentState):
    if not state.todos:
        return
    done = sum(1 for t in state.todos if t.status == "completed")
    total = len(state.todos)
    bar_width = 30
    filled = int(bar_width * done / total) if total else 0
    bar = "\u2588" * filled + "\u2591" * (bar_width - filled)
    print(f"\n  [{bar}] {done}/{total} tasks")
    for i, t in enumerate(state.todos):
        icons = {"completed": "\u2713", "in_progress": "\u25b6", "blocked": "\u2717", "pending": "\u25cb"}
        colors = {"completed": "\033[32m", "in_progress": "\033[36m", "blocked": "\033[31m", "pending": "\033[90m"}
        reset = "\033[0m"
        print(f"  {colors[t.status]}{icons[t.status]} {i+1}. {t.task}{reset}")
    print()


def display_action(block):
    if hasattr(block, "type"):
        if block.type == "text" and hasattr(block, "text") and block.text and block.text.strip():
            text = block.text.strip()
            if len(text) > 200:
                text = text[:200] + "..."
            print(f"  \U0001f4ac {text}")
        elif block.type == "server_tool_use":
            q = block.input.get("query", "") if hasattr(block, "input") else ""
            print(f"  \U0001f50d web_search: \"{q}\"")
        elif block.type == "tool_use":
            inp_str = json.dumps(block.input)[:100] if hasattr(block, "input") else ""
            print(f"  \U0001f527 {block.name}({inp_str})")
        elif block.type == "web_search_tool_result":
            results = block.content if hasattr(block, "content") else []
            n = len(results) if isinstance(results, list) else 0
            print(f"  \U0001f4f0 Got {n} search results")
