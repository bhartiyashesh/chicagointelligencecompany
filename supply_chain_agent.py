"""
Chicago Intelligence Company — Supply Chain Intelligence Agent

Autonomous supply chain analysis using Claude + specialized tools.
Cross-references global logistics, trade flows, regulatory risk,
financial sentiment, and disruption signals.

Same while(tool_use) loop + pinned todo + exit gate pattern as agent.py,
but with supply-chain-specific system prompt, tools, and report structure.
"""

import json
import os
import sys
import time

from anthropic import Anthropic

# Import shared primitives from agent_base
from agent_base import (
    AgentState, Todo, CUSTOM_TOOLS, SCRATCHPAD_DIR, REPORTS_DIR,
    EventCallback, build_plan_message, execute_tool, display_plan, display_action,
)

# Import supply chain tools
from tools import SUPPLY_CHAIN_TOOLS, execute_supply_chain_tool

client = Anthropic()
MODEL = "claude-sonnet-4-20250514"

os.makedirs(SCRATCHPAD_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# ─── Tool definitions ─────────────────────────────────────

# Combine base tools (todo, scratchpad) + SC tools + web_search
SC_ALL_TOOLS = CUSTOM_TOOLS + SUPPLY_CHAIN_TOOLS + [
    {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 25,  # More searches for SC analysis
    }
]


# ─── Extended tool execution ──────────────────────────────

def execute_sc_tool(name: str, inp: dict, state: AgentState, emit=None) -> str:
    """Execute a tool — routes to base tools or SC-specific tools."""

    # Check if it's a supply chain tool
    sc_tool_names = [t["name"] for t in SUPPLY_CHAIN_TOOLS]
    if name in sc_tool_names:
        result, source_type = execute_supply_chain_tool(name, inp)

        # Emit intelligence finding event for the dashboard
        if emit:
            summary = result[:300] if result else "No data returned"
            emit("intelligence_finding", {
                "source_type": source_type,
                "finding_summary": summary,
                "tool_name": name,
            })

        return result

    # Otherwise, use base tool execution (todo_write, todo_update, scratchpad)
    result = execute_tool(name, inp, state, emit=emit)

    # If this is a scratchpad write to synthesis_notebook.json, emit synthesis event
    if name == "write_scratchpad" and inp.get("filename") == "synthesis_notebook.json":
        try:
            notebook = json.loads(inp.get("content", "{}"))
            if emit and isinstance(notebook, dict):
                emit("synthesis_updated", {
                    "stage": notebook.get("stage", "initial_hypothesis"),
                    "title": notebook.get("title", ""),
                    "content": notebook.get("content", ""),
                })
        except json.JSONDecodeError:
            pass

    # Also detect synthesis writes via other filenames
    if name == "write_scratchpad":
        fn = inp.get("filename", "")
        if fn.startswith("synthesis_"):
            if emit:
                content = inp.get("content", "")
                # Infer stage from filename
                stage = "initial_hypothesis"
                if "observation" in fn.lower():
                    stage = "key_observation"
                elif "critical" in fn.lower() or "finding" in fn.lower():
                    stage = "critical_finding"
                elif "model" in fn.lower() or "sentiment" in fn.lower():
                    stage = "model_data"
                elif "hypothesis" in fn.lower():
                    stage = "initial_hypothesis"

                # Extract title from first line
                lines = content.strip().split("\n")
                title = lines[0].replace("#", "").strip() if lines else fn
                body = "\n".join(lines[1:]).strip() if len(lines) > 1 else content

                emit("synthesis_updated", {
                    "stage": stage,
                    "title": title,
                    "content": body[:1000],
                })

    return result


# ─── The while loop ──────────────────────────────────────

def run(company: str, max_turns: int = 60, event_callback: EventCallback = None, industry_context: str | None = None) -> AgentState:
    state = AgentState()

    def emit(event_type: str, data: dict | None = None):
        if event_callback:
            event = {"type": event_type, "timestamp": time.time(), **(data or {})}
            event_callback(event)

    base_system = f"""You are a senior supply chain intelligence analyst at Chicago Intelligence Company,
the Midwest's premier AI-powered research firm. You perform comprehensive supply chain risk
assessments and competitive displacement analysis.

TARGET COMPANY: {company}

YOUR WORKFLOW:
1. Call todo_write to create a research plan with 8-12 tasks covering:
   - Company overview & industry context
   - Tier 1-2 supplier identification (from SEC filings, import records, news)
   - Geographic concentration risk analysis
   - Single-source vulnerability detection
   - Logistics infrastructure analysis (rail, port, trucking — especially Chicago/Midwest)
   - Trade & regulatory risk (tariffs, sanctions, compliance)
   - Commodity price sensitivity
   - Competitive displacement signal detection
   - Financial sentiment correlation
   - Active disruption monitoring (weather, geopolitical, labor)
   - Scenario modeling & recommendations
   - Final report compilation

2. For each task: mark in_progress → use tools (web_search, SC tools, scratchpad) → mark completed

3. SYNTHESIS NOTEBOOK — Progressive Hypothesis Refinement:
   You MUST write synthesis updates at 4 stages during your analysis:

   a) After completing supplier mapping (tasks 1-3):
      write_scratchpad("synthesis_initial_hypothesis.md", content)
      Write your initial hypothesis about the company's supply chain risk profile.

   b) After completing infrastructure + trade analysis (tasks 4-6):
      write_scratchpad("synthesis_key_observations.md", content)
      Write key observations with specific data points.

   c) After completing competitive + financial analysis (tasks 7-9):
      write_scratchpad("synthesis_critical_findings.md", content)
      Write critical findings that would affect investment/business decisions.

   d) After completing disruption monitoring + scenarios (tasks 10-11):
      write_scratchpad("synthesis_model_data.md", content)
      Write modeling outputs: risk scores, scenario analysis, confidence levels.

4. AVAILABLE SUPPLY CHAIN TOOLS:
   - search_sec_filings: Search SEC EDGAR for 10-K filings mentioning supply chain, suppliers, risks
   - lookup_trade_flows: Query UN Comtrade for bilateral trade data by HS code
   - search_disruptions: Search GDELT for supply chain disruption news
   - get_commodity_price: Get commodity/stock prices from Alpha Vantage
   - lookup_carrier: Look up trucking carrier safety data from FMCSA
   - get_economic_indicator: Query FRED for economic indicators (GDP, PMI, freight indices)
   - get_weather_alert: Check NOAA weather alerts by location or state
   - get_disaster_alert: Check GDACS/USGS for earthquakes, floods, cyclones
   - get_us_trade_data: Query US Census for import/export statistics by HS code

5. After all research tasks are done, compile final_report.json with this EXACT structure:

{{
  "executive_summary": {{
    "company_name": "",
    "industry": "",
    "supply_chain_complexity": "Low | Medium | High | Very High",
    "overall_risk_score": "1-10 (1=minimal risk, 10=critical risk)",
    "top_findings": "Top 3 bullet points",
    "key_recommendation": ""
  }},
  "supplier_map": [
    {{
      "tier": "1 or 2",
      "supplier": "Supplier name",
      "location": "City, Country",
      "product_category": "What they supply",
      "est_revenue_share": "% if known",
      "risk_score": "1-10",
      "alternatives_available": "Yes/No/Limited"
    }}
  ],
  "geographic_risk": {{
    "concentration_index": "HHI score or qualitative (Low/Medium/High)",
    "primary_regions": "List of key regions",
    "natural_disaster_exposure": "Assessment",
    "political_stability_score": "Assessment by region",
    "logistics_reliability": "Assessment"
  }},
  "dependency_analysis": [
    {{
      "vulnerability": "Description",
      "severity": "Critical | High | Medium | Low",
      "description": "Details",
      "mitigation": "Recommended mitigation"
    }}
  ],
  "logistics_infrastructure": {{
    "primary_transport_modes": "",
    "key_chokepoints": "",
    "chicago_hub_dependency": "",
    "lead_time_estimate": "",
    "freight_cost_trend": ""
  }},
  "trade_regulatory_risk": {{
    "tariff_exposure": "",
    "sanctions_screening": "",
    "trade_policy_sensitivity": "",
    "estimated_tariff_impact": ""
  }},
  "competitive_displacement": [
    {{
      "signal": "Description of the signal",
      "competitor": "Competitor name",
      "impact": "Assessment of impact",
      "confidence": "High | Medium | Low"
    }}
  ],
  "scenarios": [
    {{
      "scenario": "What-if description",
      "probability": "High | Medium | Low",
      "impact": "Assessment",
      "response_recommendation": "What to do"
    }}
  ],
  "recommendations": {{
    "immediate_actions": "",
    "monitoring_indicators": "",
    "further_investigation": ""
  }},
  "sources": [
    {{
      "url": "",
      "title": "",
      "section": "Which report section this source supports"
    }}
  ]
}}

IMPORTANT — INLINE CITATIONS & SOURCES:
Number your sources [1], [2], [3]. Embed citation markers next to claims.
Example: "67% of components sourced from Guangdong province [3]"

RISK SCORING SCALE:
1-2: Minimal risk — highly diversified, resilient supply chain
3-4: Low risk — minor concentration, manageable vulnerabilities
5-6: Moderate risk — some single-source dependencies, geographic concentration
7-8: Elevated risk — significant vulnerabilities, limited alternatives
9-10: Critical risk — severe concentration, imminent disruption exposure

CHICAGO/MIDWEST FOCUS:
Chicago is the nation's primary rail hub where ALL six Class I railroads converge.
25% of all US rail freight passes through the Chicago region.
The Joliet/Will County corridor is the largest inland intermodal hub in North America.
Always assess how the target company's supply chain interacts with Chicago infrastructure.

RULES:
- Use real data from tools and web searches. Do not fabricate.
- If data unavailable, write "Not disclosed" — never guess.
- Be thorough. A supply chain analyst would spend days on this. Take your time.
- Every write_scratchpad should contain substantial research, not one-liners.
- Cross-reference findings across multiple sources for validation.
- Flag unverifiable claims with "(unverified)" instead of citation numbers."""

    if industry_context:
        base_system += f"""

ADDITIONAL INDUSTRY CONTEXT:
{industry_context[:20000]}"""

    # Initial user message
    state.messages = [
        {"role": "user", "content": f"Perform a comprehensive supply chain intelligence analysis on {company}. Map suppliers, assess geographic risk, identify vulnerabilities, analyze logistics infrastructure, evaluate trade/regulatory exposure, detect competitive displacement signals, and model disruption scenarios."}
    ]

    print(f"\n{'━' * 64}")
    print(f"  Chicago Intelligence Company — Supply Chain Intelligence Agent")
    print(f"  Target: {company}")
    print(f"{'━' * 64}")

    emit("agent_started", {"company": company, "max_turns": max_turns, "analysis_type": "supply_chain"})

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
                tools=SC_ALL_TOOLS,
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

            if hasattr(block, "type"):
                if block.type == "text" and hasattr(block, "text") and block.text and block.text.strip():
                    text = block.text.strip()
                    emit("text_generated", {
                        "text": text[:500],
                        "full_length": len(text),
                        "truncated": len(text) > 500,
                    })
                    # Also emit as internal_model intelligence finding
                    if len(text) > 100:
                        emit("intelligence_finding", {
                            "source_type": "INTERNAL_MODEL",
                            "finding_summary": text[:300],
                            "tool_name": "reasoning",
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
                    # Emit as search engine intelligence finding
                    emit("intelligence_finding", {
                        "source_type": "SEARCH_ENGINE",
                        "finding_summary": f"Web search returned {n} results",
                        "tool_name": "web_search",
                    })

        # Add assistant response to conversation history
        state.messages.append({"role": "assistant", "content": response.content})

        # ── HANDLE STOP REASON ──
        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_sc_tool(block.name, block.input, state, emit=emit)
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
            incomplete = [t for t in state.todos if t.status not in ("completed", "blocked")]

            if not state.todos:
                print("  ⚠️  No plan created. Nudging agent...")
                state.messages.append({
                    "role": "user",
                    "content": "You haven't created a plan yet. Call todo_write first."
                })
                continue

            if incomplete and gate_retries < max_gate_retries:
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
                break

        else:
            print(f"  ⚠️  Stop reason: {response.stop_reason}")
            state.messages.append({
                "role": "user",
                "content": "Continue from where you left off."
            })

    # ── FINAL SUMMARY ──
    done = sum(1 for t in state.todos if t.status == "completed")
    total = len(state.todos)

    print(f"\n{'━' * 64}")
    print(f"  Supply Chain Agent finished in {state.turn} turns")
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
        for fn, content in state.scratchpad.items():
            if fn.endswith(".json"):
                print(f"  Trying {fn} instead...")
                state.scratchpad["final_report.json"] = content
                break
        else:
            emit("report_error", {"error": "No final_report.json found"})
            return

    raw = state.scratchpad["final_report.json"]

    # Clean markdown fences
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
        except Exception:
            print("  ❌ Could not repair JSON.")
            emit("report_error", {"error": "Could not parse or repair JSON"})
            return

    # Import and run the SC report generator
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from supply_chain_report_generator import generate_sc_xlsx, generate_sc_csv

    safe_name = company.replace(" ", "_").replace("/", "_")
    xlsx_path = generate_sc_xlsx(report, safe_name)
    csv_path = generate_sc_csv(report, safe_name)

    # Save clean JSON
    json_path = os.path.join(REPORTS_DIR, f"{safe_name}_SC_Intelligence.json")
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  📋 JSON: reports/{safe_name}_SC_Intelligence.json")

    emit("report_ready", {
        "report": report,
        "xlsx_path": xlsx_path or "",
        "csv_path": csv_path or "",
        "json_path": json_path,
    })


# ─── Entry point ──────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python supply_chain_agent.py <company name>")
        print('Example: python supply_chain_agent.py "Toyota"')
        sys.exit(1)

    company = sys.argv[1]
    print(f"\nStarting supply chain analysis of: {company}")
    print(f"This may take 5-15 minutes depending on company complexity.\n")

    state = run(company, max_turns=60)
    generate_reports(state, company)

    print("Done. Check the reports/ and scratchpad/ directories.")
