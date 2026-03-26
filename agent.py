"""
Chicago Intelligence Company — The Real Agent

while(tool_use) loop + pinned todo + exit gate.

Web search is SERVER-SIDE: the Anthropic API executes it and returns
results in the same response (server_tool_use + web_search_tool_result blocks).

Custom tools (todo, scratchpad) are CLIENT-SIDE: we execute them and
send tool_result messages back.

A single response can contain BOTH types. When stop_reason == "tool_use",
we only need to send results for client-side tool_use blocks.
When stop_reason == "end_turn", the agent wants to stop — check exit gate.
"""

import json
import os
import sys
import time
from anthropic import Anthropic

from agent_base import (
    AgentState,
    Todo,
    CUSTOM_TOOLS,
    SCRATCHPAD_DIR,
    REPORTS_DIR,
    EventCallback,
    build_plan_message,
    execute_tool,
    display_plan,
    display_action,
)

client = Anthropic()
MODEL = "claude-sonnet-4-20250514"

os.makedirs(SCRATCHPAD_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# All tools: custom (client-side) + web_search (server-side)
ALL_TOOLS = CUSTOM_TOOLS + [
    {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 20,
    }
]


# ─── The while loop ──────────────────────────────────────

def run(company: str, max_turns: int = 50, event_callback: EventCallback = None, pitch_context: str | None = None) -> AgentState:
    state = AgentState()

    # Local emit helper
    def emit(event_type: str, data: dict | None = None):
        if event_callback:
            event = {"type": event_type, "timestamp": time.time(), **(data or {})}
            event_callback(event)

    base_system = f"""You are a senior VC analyst at Chicago Intelligence Company performing
a comprehensive investment analysis.

TARGET: {company}

YOUR WORKFLOW:
1. Call todo_write to create a research plan (5-8 tasks covering: company overview,
   leadership team, competitors, market size, traction, financials, risks, final report)
2. For each task: mark in_progress → do web searches → save findings with write_scratchpad → mark completed
3. IMPORTANT — LINKEDIN TEAM VERIFICATION: When researching the leadership team,
   search LinkedIn for each key person (e.g. "John Smith {company} LinkedIn").
   Verify they are actually affiliated with the company. For each person, include
   their LinkedIn URL if found. If you cannot verify someone on LinkedIn, note
   "LinkedIn: Not verified" — do NOT fabricate LinkedIn URLs.
4. After all research tasks are done, read back your scratchpad files and compile a
   final_report.json with this EXACT structure:

{{
  "executive_summary": {{ "company_name": "", "product": "", "founded": "", "funding_stage": "", "lead_investors": "" }},
  "leadership_team": [{{ "position": "", "name": "", "background": "", "linkedin": "", "key_experience": "" }}],
  "team_size": "", "team_breakdown": "",
  "market_analysis": [{{ "category": "", "current_size": "", "projection": "", "cagr": "", "notes": "" }}],
  "product_positioning": {{ "core_value_prop": "", "key_differentiators": "", "target_customers": "", "pricing_model": "" }},
  "traction_metrics": [{{ "metric": "", "current_value": "", "significance": "" }}],
  "competitive_landscape": [{{ "competitor": "", "valuation_funding": "", "focus": "", "strengths": "", "weaknesses_vs_target": "" }}],
  "financial_analysis": {{ "funding_raised": "", "investors": "", "revenue_model": "", "burn_rate": "", "runway": "" }},
  "risk_assessment": [{{ "risk_category": "", "level": "", "description": "", "mitigation": "" }}],
  "investment_recommendation": {{ "overall_rating": "", "sentiment": "", "investment_thesis": "", "key_strengths": "", "key_concerns": "", "valuation_assessment": "", "recommended_investment": "", "expected_timeline_to_exit": "", "risk_adjusted_return": "" }},
  "sources": [{{ "url": "", "title": "", "section": "" }}]
}}

IMPORTANT — INLINE CITATIONS & SOURCES:
As you research, number your sources starting from [1]. In the report text values,
embed citation markers like [1], [2], [3] next to specific claims they support.
Example: "Revenue estimated at $50M ARR [3] with 40% YoY growth [3][7]"

The "sources" array MUST be ordered by number. Each source has:
- url: the actual URL
- title: page title or short description
- section: which report section it primarily supports (e.g. "Market Analysis")

Every factual claim should have at least one citation. If a claim cannot be
verified, write "(unverified)" instead of a citation number.

Save the final report as write_scratchpad(filename="final_report.json", content=<the JSON>).

RATING SCALE for overall_rating and sentiment:
- "STRONG BUY" / sentiment: "Bullish" — Exceptional opportunity, invest aggressively
- "BUY" / sentiment: "Positive" — Good opportunity, recommend investment
- "LEAN BUY" / sentiment: "Cautiously Positive" — Promising but some concerns, small position
- "PASS" / sentiment: "Negative" — Do not invest, risks outweigh opportunity
- "NEEDS MORE DATA" / sentiment: "Inconclusive" — Cannot make a call, insufficient information
Never use "HOLD" — you are evaluating a NEW investment, not managing an existing position.
Be decisive. A VC must commit or pass.

RULES:
- Use real data from web searches. Do not fabricate numbers.
- If data is unavailable, write "Not disclosed" — never guess.
- Be thorough. A real VC analyst would spend hours on this. Take your time.
- Every write_scratchpad should contain substantial research, not one-liners.
- Never fabricate LinkedIn URLs. Search and verify each person individually."""

    # Inject uploaded pitch deck content if provided
    if pitch_context:
        base_system += f"""

UPLOADED PITCH DECK / DOCUMENT:
The user has uploaded a document about this company. Use this as supplementary context
alongside your web research. Cross-reference claims made in the document with public data.
Flag any discrepancies between the pitch and publicly available information.

--- DOCUMENT CONTENT ---
{pitch_context[:30000]}
--- END DOCUMENT ---"""

    # Initial user message
    state.messages = [
        {"role": "user", "content": f"Analyze {company} for VC investment."}
    ]

    print(f"\n{'━' * 64}")
    print(f"  Chicago Intelligence Company — VC Analysis Agent")
    print(f"  Target: {company}")
    print(f"{'━' * 64}")

    emit("agent_started", {"company": company, "max_turns": max_turns})

    gate_retries = 0
    max_gate_retries = 3

    while state.turn < max_turns:
        state.turn += 1

        # Build system prompt with PINNED plan
        system = base_system + build_plan_message(state)

        print(f"\n{'─' * 40} Turn {state.turn} {'─' * 10}")
        display_plan(state)

        emit("turn_started", {
            "turn": state.turn,
            "total_tokens": state.total_tokens,
            "total_searches": state.total_searches,
        })

        # ── CALL THE API ──
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=8192,
                system=system,
                messages=state.messages,
                tools=ALL_TOOLS,
            )
        except Exception as e:
            print(f"  ⚠️  API error: {e}")
            emit("api_error", {"error": str(e), "will_retry": "rate" in str(e).lower()})
            if "rate" in str(e).lower():
                print("  Waiting 30s for rate limit...")
                time.sleep(30)
                continue
            raise

        # Track usage
        input_tokens = 0
        output_tokens = 0
        search_requests = 0
        if hasattr(response, "usage"):
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            state.total_tokens += input_tokens + output_tokens
            if hasattr(response.usage, "server_tool_use"):
                stu = response.usage.server_tool_use
                if hasattr(stu, "web_search_requests"):
                    search_requests = stu.web_search_requests
                    state.total_searches += search_requests

        emit("usage_tracked", {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": state.total_tokens,
            "search_requests": search_requests,
            "total_searches": state.total_searches,
            "estimated_cost": round(state.total_tokens * 0.008 / 1000 + state.total_searches * 0.01, 4),
        })

        # ── PROCESS RESPONSE CONTENT ──
        for block in response.content:
            display_action(block)

            # Emit events for each block type
            if hasattr(block, "type"):
                if block.type == "text" and hasattr(block, "text") and block.text and block.text.strip():
                    text = block.text.strip()
                    emit("text_generated", {
                        "text": text[:500],
                        "full_length": len(text),
                        "truncated": len(text) > 500,
                    })
                elif block.type == "server_tool_use":
                    q = block.input.get("query", "") if hasattr(block, "input") else ""
                    emit("search_initiated", {"query": q})
                elif block.type == "tool_use":
                    inp_summary = json.dumps(block.input)[:200] if hasattr(block, "input") else ""
                    emit("tool_called", {"name": block.name, "input_summary": inp_summary})
                elif block.type == "web_search_tool_result":
                    results = block.content if hasattr(block, "content") else []
                    n = len(results) if isinstance(results, list) else 0
                    emit("search_completed", {"result_count": n})

        # Add assistant response to conversation history
        state.messages.append({"role": "assistant", "content": response.content})

        # ── HANDLE STOP REASON ──

        if response.stop_reason == "tool_use":
            # There are client-side tool_use blocks that need results
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_tool(block.name, block.input, state, emit=emit)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
                    result_line = result.split(chr(10))[0]
                    print(f"    → {result_line}")
                    emit("tool_result", {"name": block.name, "result_summary": result_line})

            if tool_results:
                state.messages.append({"role": "user", "content": tool_results})

        elif response.stop_reason == "end_turn":
            # Agent wants to stop. Check exit gate.
            incomplete = [t for t in state.todos if t.status not in ("completed", "blocked")]

            if not state.todos:
                # No plan was created — force continue
                print("  ⚠️  No plan created. Nudging agent...")
                state.messages.append({
                    "role": "user",
                    "content": "You haven't created a plan yet. Call todo_write first."
                })
                continue

            if incomplete and gate_retries < max_gate_retries:
                # EXIT GATE: force back into the loop
                gate_retries += 1
                names = ", ".join(f"'{t.task}'" for t in incomplete)
                print(f"  🚫 Exit gate: {len(incomplete)} tasks incomplete (retry {gate_retries}/{max_gate_retries})")
                emit("exit_gate_triggered", {
                    "incomplete_count": len(incomplete),
                    "retry_num": gate_retries,
                    "max_retries": max_gate_retries,
                })
                state.messages.append({
                    "role": "user",
                    "content": (
                        f"You still have {len(incomplete)} incomplete tasks: {names}. "
                        f"Continue working on them. Do not stop until all tasks are done."
                    )
                })
                continue
            else:
                # All done (or max retries hit) — exit
                break

        else:
            # max_tokens or other stop — continue
            print(f"  ⚠️  Stop reason: {response.stop_reason}")
            state.messages.append({
                "role": "user",
                "content": "Continue from where you left off."
            })

    # ── FINAL SUMMARY ──
    done = sum(1 for t in state.todos if t.status == "completed")
    total = len(state.todos)

    print(f"\n{'━' * 64}")
    print(f"  Agent finished in {state.turn} turns")
    print(f"  Tasks: {done}/{total} completed")
    print(f"  Web searches: {state.total_searches}")
    print(f"  Total tokens: {state.total_tokens:,}")
    print(f"  Scratchpad files: {list(state.scratchpad.keys())}")
    print(f"{'━' * 64}\n")

    emit("agent_finished", {
        "turns": state.turn,
        "tasks_done": done,
        "tasks_total": total,
        "total_searches": state.total_searches,
        "total_tokens": state.total_tokens,
        "scratchpad_files": list(state.scratchpad.keys()),
    })

    return state


# ─── Report generation ────────────────────────────────────

def generate_reports(state: AgentState, company: str, event_callback: EventCallback = None):
    """Generate XLSX + CSV from the final_report.json scratchpad file."""

    def emit(event_type: str, data: dict | None = None):
        if event_callback:
            event_callback({"type": event_type, "timestamp": time.time(), **(data or {})})

    if "final_report.json" not in state.scratchpad:
        print("  ⚠️  No final_report.json found in scratchpad.")
        print("  Available files:", list(state.scratchpad.keys()))

        # Try to find any JSON file
        for fn, content in state.scratchpad.items():
            if fn.endswith(".json"):
                print(f"  Trying {fn} instead...")
                state.scratchpad["final_report.json"] = content
                break
        else:
            print("  Cannot generate reports without structured JSON data.")
            emit("report_error", {"error": "No final_report.json found"})
            return

    raw = state.scratchpad["final_report.json"]

    # Clean up if the LLM wrapped it in markdown fences
    if raw.strip().startswith("```"):
        raw = raw.strip()
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]

    try:
        report = json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse error: {e}")
        print("  Attempting repair with Claude...")
        repair_resp = client.messages.create(
            model=MODEL,
            max_tokens=8192,
            system="Fix this malformed JSON. Return ONLY valid JSON, no markdown fences, no explanation.",
            messages=[{"role": "user", "content": f"Fix:\n{raw[:6000]}"}],
        )
        fixed = repair_resp.content[0].text.strip()
        if fixed.startswith("```"):
            fixed = fixed.split("\n", 1)[1].rsplit("```", 1)[0]
        try:
            report = json.loads(fixed.strip())
        except:
            print("  ❌ Could not repair JSON. Saving raw output.")
            with open(os.path.join(REPORTS_DIR, f"{company}_raw.txt"), "w") as f:
                f.write(raw)
            emit("report_error", {"error": "Could not parse or repair JSON"})
            return

    # Import and run the report generator
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from report_generator import generate_xlsx, generate_csv

    safe_name = company.replace(" ", "_").replace("/", "_")
    xlsx_path = generate_xlsx(report, safe_name)
    csv_path = generate_csv(report, safe_name)

    # Also save the clean JSON
    json_path = os.path.join(REPORTS_DIR, f"{safe_name}_VC_Analysis.json")
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  📋 JSON: reports/{safe_name}_VC_Analysis.json")

    emit("report_ready", {
        "report": report,
        "xlsx_path": xlsx_path or "",
        "csv_path": csv_path or "",
        "json_path": json_path,
    })


# ─── Entry point ──────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agent.py <company name>")
        print('Example: python agent.py "Stripe"')
        sys.exit(1)

    company = sys.argv[1]
    print(f"\nStarting analysis of: {company}")
    print(f"This may take 3-10 minutes depending on company complexity.\n")

    state = run(company, max_turns=50)
    generate_reports(state, company)

    print("Done. Check the reports/ and scratchpad/ directories.")
