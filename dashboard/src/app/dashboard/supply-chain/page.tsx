"use client";

import { useReducer, useCallback, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type {
  SupplyChainDashboardState,
  AgentEvent,
  ActivityEntry,
  TaskInfo,
  IntelligenceFinding,
  SynthesisEntry,
  SupplyChainReportData,
} from "@/lib/types";
import { useAgentWebSocket } from "@/lib/websocket";
import AgentProtocol from "@/components/supply-chain/AgentProtocol";
import IntelligenceFeed from "@/components/supply-chain/IntelligenceFeed";
import SynthesisNotebook from "@/components/supply-chain/SynthesisNotebook";
import SCReportOverlay from "@/components/supply-chain/SCReportOverlay";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── State Machine ──────────────────────────────────────

const initialState: SupplyChainDashboardState = {
  status: "idle",
  company: "",
  runId: null,
  turn: 0,
  totalSearches: 0,
  totalTokens: 0,
  estimatedCost: 0,
  tasks: [],
  activityLog: [],
  intelligenceFindings: [],
  synthesisNotebook: [],
  report: null,
  reportPaths: null,
  error: null,
};

let eventCounter = 0;

function makeEntry(
  type: AgentEvent["type"],
  text: string,
  icon: ActivityEntry["icon"],
  timestamp: number,
  detail?: string
): ActivityEntry {
  return {
    id: `${type}-${++eventCounter}`,
    type: type as ActivityEntry["type"],
    text,
    detail,
    timestamp,
    icon,
  };
}

type Action =
  | { type: "START_RUN"; company: string; runId: string }
  | { type: "EVENT"; event: AgentEvent }
  | { type: "RESET" };

function reducer(state: SupplyChainDashboardState, action: Action): SupplyChainDashboardState {
  if (action.type === "RESET") return initialState;

  if (action.type === "START_RUN") {
    return {
      ...initialState,
      status: "connecting",
      company: action.company,
      runId: action.runId,
    };
  }

  const event = action.event;
  const ts = (event.timestamp as number) || Date.now() / 1000;

  switch (event.type) {
    case "agent_started":
      return {
        ...state,
        status: "running",
        company: (event.company as string) || state.company,
        activityLog: [
          ...state.activityLog,
          makeEntry("agent_started", `Initiating supply chain analysis: ${event.company}`, "info", ts),
        ],
      };

    case "turn_started":
      return { ...state, turn: (event.turn as number) || state.turn };

    case "plan_created": {
      const tasks = (event.tasks as Array<{ index: number; task: string; status: string }>).map(
        (t) => ({ index: t.index, task: t.task, status: t.status as TaskInfo["status"] })
      );
      return {
        ...state,
        tasks,
        activityLog: [
          ...state.activityLog,
          makeEntry("plan_created", `Intelligence plan established \u2014 ${tasks.length} objectives`, "task", ts),
        ],
      };
    }

    case "task_updated": {
      const idx = event.index as number;
      const newStatus = event.status as TaskInfo["status"];
      const taskName = event.task as string;
      const tasks = state.tasks.map((t) =>
        t.index === idx ? { ...t, status: newStatus } : t
      );
      const icon = newStatus === "completed" ? "task" : "info";
      const verb =
        newStatus === "completed" ? "Completed" : newStatus === "in_progress" ? "Started" : newStatus === "blocked" ? "Blocked" : "Updated";
      return {
        ...state,
        tasks,
        activityLog: [
          ...state.activityLog,
          makeEntry("task_updated", `${verb}: ${taskName}`, icon as ActivityEntry["icon"], ts),
        ],
      };
    }

    case "search_initiated":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("search_initiated", `${event.query}`, "search", ts),
        ],
      };

    case "search_completed":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("search_completed", `${event.result_count} results indexed`, "result", ts),
        ],
      };

    case "tool_called":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("tool_called", `${event.name}`, "tool", ts, (event.input_summary as string)?.slice(0, 100)),
        ],
      };

    case "tool_result":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("tool_result", `${event.result_summary}`, "info", ts),
        ],
      };

    case "scratchpad_saved": {
      const fn = event.filename as string;
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("scratchpad_saved", `${fn}`, "file", ts, `${((event.char_count as number) || 0).toLocaleString()} chars`),
        ],
      };
    }

    case "text_generated":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("text_generated", (event.text as string) || "", "text", ts),
        ],
      };

    case "usage_tracked":
      return {
        ...state,
        totalTokens: (event.total_tokens as number) || state.totalTokens,
        totalSearches: (event.total_searches as number) || state.totalSearches,
        estimatedCost: (event.estimated_cost as number) || state.estimatedCost,
      };

    case "exit_gate_triggered":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("exit_gate_triggered", `${event.incomplete_count} tasks remaining \u2014 continuing`, "gate", ts),
        ],
      };

    case "api_error":
      return {
        ...state,
        status: (event as Record<string, unknown>).fatal ? "error" : state.status,
        error: (event.error as string) || null,
        activityLog: [
          ...state.activityLog,
          makeEntry("api_error", `${event.error}`, "error", ts),
        ],
      };

    case "agent_finished":
      return {
        ...state,
        status: "complete",
        activityLog: [
          ...state.activityLog,
          makeEntry(
            "agent_finished",
            `Analysis complete \u2014 ${event.tasks_done}/${event.tasks_total} tasks, ${event.total_searches} queries`,
            "info",
            ts
          ),
        ],
      };

    case "report_ready":
      return {
        ...state,
        report: event.report as SupplyChainReportData,
        reportPaths: {
          xlsx: (event.xlsx_path as string) || "",
          csv: (event.csv_path as string) || "",
          json: (event.json_path as string) || "",
        },
        activityLog: [
          ...state.activityLog,
          makeEntry("report_ready", "Supply chain intelligence report generated", "file", ts),
        ],
      };

    case "report_error":
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          makeEntry("report_error", `Report error: ${event.error}`, "error", ts),
        ],
      };

    case "stream_end":
      return { ...state, status: state.status === "running" ? "complete" : state.status };

    // ─── Supply Chain specific events ──────────────────
    case "intelligence_finding" as AgentEvent["type"]: {
      const finding: IntelligenceFinding = {
        id: (event.id as string) || `finding-${Date.now()}-${Math.random()}`,
        source_type: event.source_type as IntelligenceFinding["source_type"],
        finding_summary: (event.finding_summary as string) || "",
        raw_data_preview: event.raw_data_preview as string | undefined,
        timestamp: ts,
        tool_name: (event.tool_name as string) || "unknown",
      };
      return {
        ...state,
        intelligenceFindings: [...state.intelligenceFindings, finding],
      };
    }

    case "synthesis_updated" as AgentEvent["type"]: {
      const entry: SynthesisEntry = {
        stage: event.stage as SynthesisEntry["stage"],
        title: (event.title as string) || "",
        content: (event.content as string) || "",
        timestamp: ts,
      };
      // Replace existing entry with same stage+title, or append
      const existing = state.synthesisNotebook.findIndex(
        (e) => e.stage === entry.stage && e.title === entry.title
      );
      const notebook = [...state.synthesisNotebook];
      if (existing >= 0) {
        notebook[existing] = entry;
      } else {
        notebook.push(entry);
      }
      return {
        ...state,
        synthesisNotebook: notebook,
      };
    }

    default:
      return state;
  }
}

// ─── Page Component ──────────────────────────────────────

export default function SupplyChainDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <SupplyChainDashboardInner />
    </Suspense>
  );
}

function SupplyChainDashboardInner() {
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showReport, setShowReport] = useState(false);
  const [inputCompany, setInputCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"protocol" | "feed" | "synthesis">("feed");

  useEffect(() => setMounted(true), []);

  const handleEvent = useCallback(
    (event: AgentEvent) => dispatch({ type: "EVENT", event }),
    []
  );

  useAgentWebSocket(state.runId, handleEvent);

  const startAnalysis = async () => {
    if (!inputCompany.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: inputCompany.trim(),
          analysis_type: "supply_chain",
        }),
      });
      const data = await res.json();

      if (data.cached && data.report) {
        dispatch({ type: "START_RUN", company: inputCompany.trim(), runId: data.run_id });
        dispatch({
          type: "EVENT",
          event: {
            type: "report_ready",
            report: data.report,
            cached: true,
            age_hours: data.age_hours,
          },
        });
      } else {
        dispatch({ type: "START_RUN", company: inputCompany.trim(), runId: data.run_id });
      }
    } catch (err) {
      dispatch({ type: "EVENT", event: { type: "api_error", error: `Connection failed: ${err}`, fatal: true } });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Idle State ──────────────────────────────────────
  if (state.status === "idle") {
    return (
      <div className="min-h-screen relative bg-[#0a0a0a]">
        {/* Subtle grid background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, #F97316 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#F97316]/[0.02] blur-[120px]" />
        </div>

        <div className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-6 transition-opacity duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
          {/* Brand mark */}
          <div className="mb-10 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity">
              <span className="text-[clamp(32px,5vw,42px)] font-extralight text-[#F97316] leading-none -mt-1">/</span>
              <span className="text-[clamp(18px,3vw,24px)] font-black tracking-[-0.02em] text-white">cic</span>
            </Link>

            <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-white mb-2">
              Supply Chain
              <span className="text-[#F97316] font-normal"> Intelligence</span>
            </h1>
            <p className="text-base sm:text-lg text-neutral-500 font-light tracking-wide">
              Autonomous supply chain analysis and risk assessment
            </p>
          </div>

          {/* Price tag */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-700 bg-neutral-900">
              <span className="text-[11px] font-mono text-[#F97316]">$75</span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">per analysis</span>
            </span>
          </div>

          {/* Input area */}
          <div className="w-full max-w-lg px-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm p-5 sm:p-8">
              <label className="block text-[10px] font-medium tracking-[0.25em] uppercase text-neutral-500 mb-3">
                Target Company
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputCompany}
                  onChange={(e) => setInputCompany(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startAnalysis()}
                  placeholder="Apple, Toyota, Caterpillar..."
                  className="flex-1 bg-[#0a0a0a] border border-neutral-700 rounded-lg px-5 py-3.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#F97316]/40 focus:ring-1 focus:ring-[#F97316]/20 transition-all duration-200 font-[system-ui]"
                  autoFocus
                />
                <button
                  onClick={startAnalysis}
                  disabled={!inputCompany.trim() || isSubmitting}
                  className="px-7 py-3.5 bg-[#F97316] text-white text-sm font-semibold rounded-lg hover:shadow-[0_0_24px_rgba(249,115,22,0.35)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                >
                  {isSubmitting ? "Initiating..." : "Analyze Supply Chain"}
                </button>
              </div>

              <div className="mt-5 flex items-center gap-4 text-[11px] text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[#F97316]/60" />
                  5-15 min runtime
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[#F97316]/60" />
                  XLSX + CSV + JSON
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[#F97316]/60" />
                  9-section report
                </div>
              </div>
            </div>
          </div>

          {/* Try Demo */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => setInputCompany("Apple")}
              className="text-[10px] tracking-[0.12em] uppercase text-[#F97316]/60 hover:text-[#F97316] transition-colors cursor-pointer"
            >
              Try Demo: Apple
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Running/Complete State: Dashboard ────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Top Bar */}
      <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-[#0a0a0a] border-b border-neutral-800 shrink-0">
        {/* Left: brand + company */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1 hover:opacity-70 transition-opacity">
            <span className="text-[18px] font-extralight text-[#F97316] leading-none -mt-0.5">/</span>
            <span className="text-[12px] font-black tracking-[-0.02em] text-white">cic</span>
          </Link>
          <div className="w-px h-4 bg-neutral-700" />
          <h1 className="text-sm font-light text-white tracking-wide">
            <span className="text-[#F97316] font-medium">{state.company}</span>
          </h1>
          {/* Status badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-700 bg-neutral-900">
            <div className={`w-1.5 h-1.5 rounded-full ${
              state.status === "running" ? "bg-[#F97316] animate-pulse" :
              state.status === "complete" ? "bg-[#10B981]" :
              state.status === "connecting" ? "bg-amber-500 animate-pulse" :
              state.status === "error" ? "bg-red-500" :
              "bg-neutral-500"
            }`} />
            <span className="text-[10px] font-medium tracking-widest uppercase text-neutral-400">
              {state.status === "running" ? "Active" :
               state.status === "complete" ? "Complete" :
               state.status === "connecting" ? "Connecting" :
               state.status === "error" ? "Error" : "Standby"}
            </span>
          </div>
        </div>

        {/* Right: stats + actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Cycle", value: String(state.turn) },
              { label: "Queries", value: String(state.totalSearches) },
              { label: "Tokens", value: state.totalTokens > 1000 ? `${(state.totalTokens / 1000).toFixed(1)}K` : String(state.totalTokens) },
              { label: "Cost", value: `$${state.estimatedCost.toFixed(2)}` },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1">
                  <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-600">{s.label}</span>
                  <span className="text-xs font-mono font-medium text-[#F97316]">{s.value}</span>
                </div>
                {i < arr.length - 1 && <div className="w-px h-3 bg-neutral-800" />}
              </div>
            ))}
          </div>

          {state.report && state.runId && (
            <>
              <a
                href={`${API_BASE}/api/download-all/${state.runId}`}
                className="px-4 py-1.5 rounded-lg border border-[#F97316]/30 text-[#F97316] text-[11px] font-semibold tracking-wider uppercase hover:bg-[#F97316]/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v8M3 6l3 3 3-3" />
                  <path d="M1 10h10" />
                </svg>
                Download All
              </a>
              <button
                onClick={() => setShowReport(true)}
                className="px-4 py-1.5 rounded-lg bg-[#F97316] text-white text-[11px] font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all duration-200 cursor-pointer"
              >
                View Report
              </button>
            </>
          )}

          {(state.status === "error" || state.status === "complete") && (
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="px-4 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 text-[11px] font-medium tracking-wider uppercase hover:border-[#F97316]/40 hover:text-[#F97316] transition-all duration-200 cursor-pointer"
            >
              New Analysis
            </button>
          )}
        </div>
      </header>

      {/* Orange accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#F97316]/40 to-transparent" />

      {/* Mobile tabs (below 1024px) */}
      <div className="lg:hidden flex border-b border-neutral-800">
        {(["protocol", "feed", "synthesis"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-[#F97316] border-b-2 border-[#F97316]"
                : "text-neutral-600 hover:text-neutral-400"
            }`}
          >
            {tab === "protocol" ? "Protocol" : tab === "feed" ? "Intelligence" : "Synthesis"}
          </button>
        ))}
      </div>

      {/* Three-panel layout (desktop) / Single panel (mobile) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: all three panels */}
        <div className={`w-[25%] border-r border-neutral-800 hidden lg:block`}>
          <AgentProtocol tasks={state.tasks} status={state.status} company={state.company} />
        </div>
        <div className={`w-[45%] border-r border-neutral-800 hidden lg:block`}>
          <IntelligenceFeed findings={state.intelligenceFindings} status={state.status} />
        </div>
        <div className={`w-[30%] hidden lg:block`}>
          <SynthesisNotebook entries={state.synthesisNotebook} status={state.status} />
        </div>

        {/* Mobile: single panel based on active tab */}
        <div className="flex-1 lg:hidden">
          {activeTab === "protocol" && (
            <AgentProtocol tasks={state.tasks} status={state.status} company={state.company} />
          )}
          {activeTab === "feed" && (
            <IntelligenceFeed findings={state.intelligenceFindings} status={state.status} />
          )}
          {activeTab === "synthesis" && (
            <SynthesisNotebook entries={state.synthesisNotebook} status={state.status} />
          )}
        </div>
      </div>

      {/* Report overlay */}
      {showReport && state.report && state.runId && (
        <SCReportOverlay
          report={state.report}
          runId={state.runId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
