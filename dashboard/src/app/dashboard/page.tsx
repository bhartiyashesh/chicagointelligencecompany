"use client";

import { useReducer, useCallback, useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DashboardState, AgentEvent, ActivityEntry, TaskInfo } from "@/lib/types";
import { useAgentWebSocket } from "@/lib/websocket";
import { playDemo } from "@/lib/demo";
import TopBar from "@/components/TopBar";
import ActivityFeed from "@/components/ActivityFeed";
import Workspace from "@/components/Workspace";
import ReportOverlay from "@/components/ReportOverlay";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── State Machine ──────────────────────────────────────

const initialState: DashboardState = {
  status: "idle",
  company: "",
  runId: null,
  turn: 0,
  totalSearches: 0,
  totalTokens: 0,
  estimatedCost: 0,
  tasks: [],
  activityLog: [],
  scratchpadFiles: {},
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

function reducer(state: DashboardState, action: Action): DashboardState {
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
          makeEntry("agent_started", `Initiating analysis: ${event.company}`, "info", ts),
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
          makeEntry("plan_created", `Research plan established \u2014 ${tasks.length} objectives`, "task", ts),
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
        scratchpadFiles: {
          ...state.scratchpadFiles,
          [fn]: {
            content: (event.content as string) || "",
            charCount: (event.char_count as number) || 0,
          },
        },
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
            `Analysis complete \u2014 ${event.tasks_done}/${event.tasks_total} tasks, ${event.total_searches} queries, ${((event.total_tokens as number) / 1000).toFixed(1)}K tokens`,
            "info",
            ts
          ),
        ],
      };

    case "report_ready":
      return {
        ...state,
        report: event.report as Record<string, unknown>,
        reportPaths: {
          xlsx: (event.xlsx_path as string) || "",
          csv: (event.csv_path as string) || "",
          json: (event.json_path as string) || "",
        },
        activityLog: [
          ...state.activityLog,
          makeEntry("report_ready", "Investment report generated", "file", ts),
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

    default:
      return state;
  }
}

// ─── Dot Grid Background ────────────────────────────────

function DotGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-40" />
      {/* Radial glow from center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[120px]" />
    </div>
  );
}

// ─── Page Component (wrapped with Suspense for useSearchParams) ──

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showReport, setShowReport] = useState(false);
  const [inputCompany, setInputCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pitchFile, setPitchFile] = useState<File | null>(null);
  const [pitchContext, setPitchContext] = useState<string | null>(null);
  const [uploadingPitch, setUploadingPitch] = useState(false);
  const [analysisType, setAnalysisType] = useState<"diligence" | "strategy">("diligence");
  const [isDemo, setIsDemo] = useState(false);
  const demoCleanupRef = useRef<(() => void) | null>(null);
  const demoAutoStarted = useRef(false);

  useEffect(() => setMounted(true), []);

  const handleEvent = useCallback(
    (event: AgentEvent) => dispatch({ type: "EVENT", event }),
    []
  );

  useAgentWebSocket(state.runId, handleEvent);

  const startDemo = useCallback(() => {
    setIsDemo(true);
    dispatch({ type: "START_RUN", company: "Indigo Systems & Technology Consulting Inc", runId: "demo" });
    // Small delay to let the UI transition, then start the event replay
    setTimeout(() => {
      demoCleanupRef.current = playDemo((event) => {
        dispatch({ type: "EVENT", event });
      }, 2); // 2x speed
    }, 300);
  }, []);

  // Read URL params for analysis type and demo
  useEffect(() => {
    if (searchParams.get("type") === "strategy") setAnalysisType("strategy");
  }, [searchParams]);

  // If ?demo=true, pre-fill company name but let user click "Start"
  useEffect(() => {
    if (searchParams.get("demo") === "true" && !demoAutoStarted.current && state.status === "idle") {
      demoAutoStarted.current = true;
      setInputCompany("Indigo Systems and Technology Consulting Inc");
    }
  }, [searchParams, state.status]);

  // Cleanup demo on unmount or reset
  useEffect(() => {
    return () => { demoCleanupRef.current?.(); };
  }, []);

  const handlePitchUpload = async (file: File) => {
    setPitchFile(file);
    setUploadingPitch(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/upload-pitch`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.content) {
        setPitchContext(data.content);
      }
    } catch {
      setPitchFile(null);
    } finally {
      setUploadingPitch(false);
    }
  };

  const startAnalysis = async () => {
    if (!inputCompany.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: inputCompany.trim(),
          pitch_context: pitchContext,
          analysis_type: analysisType,
        }),
      });
      const data = await res.json();

      if (data.cached && data.report) {
        // Cached report — skip the agent, go straight to complete
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

  // ─── Idle State: Landing ──────────────────────────────
  if (state.status === "idle") {
    return (
      <div className="min-h-screen relative bg-[#f5f5f0]">
        <DotGrid />

        <div className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-6 transition-opacity duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
          {/* / cic brand mark — links back to landing */}
          <div className="mb-10 text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity">
              <span className="text-[clamp(32px,5vw,42px)] font-extralight text-[#F97316] leading-none -mt-1">/</span>
              <span className="text-[clamp(18px,3vw,24px)] font-black tracking-[-0.02em] text-text-primary">cic</span>
            </Link>

            <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-text-primary mb-2">
              Chicago
              <span className="text-accent font-normal"> Intelligence</span>
            </h1>
            <p className="text-base sm:text-lg text-text-dim font-light tracking-wide">
              Autonomous VC analysis and M&A due diligence
            </p>
          </div>

          {/* Input area */}
          <div className="w-full max-w-lg px-2">
            <div className="glass-card rounded-2xl p-5 sm:p-8">
              {/* Analysis type selector */}
              <div className="flex items-center gap-1 p-1 bg-bg-secondary/50 rounded-lg mb-5">
                <button
                  onClick={() => setAnalysisType("diligence")}
                  className={`flex-1 py-2.5 px-4 rounded-md text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${
                    analysisType === "diligence"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-dim hover:text-text-secondary"
                  }`}
                >
                  Due Diligence
                  <span className="ml-1.5 text-[9px] opacity-60">$40</span>
                </button>
                <button
                  onClick={() => setAnalysisType("strategy")}
                  className={`flex-1 py-2.5 px-4 rounded-md text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${
                    analysisType === "strategy"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-dim hover:text-text-secondary"
                  }`}
                >
                  Strategy Analysis
                  <span className="ml-1.5 text-[9px] opacity-60">$5</span>
                </button>
              </div>

              <label className="block text-[10px] font-medium tracking-[0.25em] uppercase text-text-dim mb-3">
                {analysisType === "diligence" ? "Target Company" : "Your Company"}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputCompany}
                  onChange={(e) => setInputCompany(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startAnalysis()}
                  placeholder={analysisType === "diligence" ? "Stripe, Figma, Anduril..." : "Enter your company name..."}
                  className="flex-1 bg-white border border-border rounded-lg px-5 py-3.5 text-text-primary text-sm placeholder:text-text-dim/60 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all duration-200"
                  autoFocus
                />
                <button
                  onClick={startAnalysis}
                  disabled={!inputCompany.trim() || isSubmitting}
                  className="px-7 py-3.5 bg-accent text-white text-sm font-semibold rounded-lg hover:shadow-[0_0_24px_rgba(37,99,235,0.35)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                >
                  {isSubmitting ? "Initiating..." : "Analyze"}
                </button>
              </div>

              {/* Pitch deck upload */}
              <div className="mt-5 pt-5 border-t border-border">
                <label className="block text-[10px] font-medium tracking-[0.25em] uppercase text-text-dim mb-2.5">
                  Attach Pitch Deck
                  <span className="text-text-dim/50 ml-1 normal-case tracking-normal">(optional)</span>
                </label>

                {!pitchFile ? (
                  <label className="flex items-center justify-center gap-3 py-3.5 px-4 border border-dashed border-border rounded-lg hover:border-accent/30 hover:bg-accent/[0.02] transition-all duration-200 cursor-pointer group">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-text-dim group-hover:text-accent transition-colors">
                      <path d="M8 1v10M4 5l4-4 4 4" />
                      <path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <span className="text-xs text-text-dim group-hover:text-text-secondary transition-colors">
                      Upload PDF, TXT, or CSV
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePitchUpload(file);
                      }}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 py-2.5 px-4 bg-accent/5 border border-accent/20 rounded-lg">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-accent shrink-0">
                      <path d="M2 7h10M7 2v10" />
                    </svg>
                    <span className="text-xs text-accent font-mono flex-1 truncate">{pitchFile.name}</span>
                    {uploadingPitch ? (
                      <span className="text-[10px] text-text-dim animate-dot-pulse">Processing...</span>
                    ) : pitchContext ? (
                      <span className="text-[10px] text-success">Ready</span>
                    ) : null}
                    <button
                      onClick={() => { setPitchFile(null); setPitchContext(null); }}
                      className="text-text-dim hover:text-error transition-colors cursor-pointer"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 1l8 8M9 1l-8 8" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center gap-4 text-[11px] text-text-dim">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-accent/60" />
                  {analysisType === "diligence" ? "3-10 min" : "5-15 min"} runtime
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-accent/60" />
                  XLSX + CSV + JSON
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-accent/60" />
                  {analysisType === "diligence" ? "10-section report" : "12-framework analysis"}
                </div>
              </div>
            </div>
          </div>

          {/* Demo + Sample run buttons */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={startDemo}
              className="text-[11px] font-medium tracking-[0.15em] uppercase text-text-dim hover:text-accent border-b border-dashed border-text-dim/30 hover:border-accent/40 pb-0.5 transition-all duration-200 cursor-pointer"
            >
              Watch Demo Analysis
            </button>
            <button
              onClick={() => {
                setInputCompany("Indigo Systems and Technology Consulting Inc");
              }}
              className="text-[10px] tracking-[0.12em] uppercase text-accent/60 hover:text-accent transition-colors cursor-pointer"
            >
              or try: Indigo Systems and Technology Consulting Inc
            </button>
          </div>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 accent-line" />
        </div>
      </div>
    );
  }

  // ─── Running/Complete State: Dashboard ────────────────
  return (
    <div className="h-screen flex flex-col bg-[#f5f5f0]">
      <TopBar
        company={state.company}
        status={state.status}
        turn={state.turn}
        searches={state.totalSearches}
        tokens={state.totalTokens}
        cost={state.estimatedCost}
        runId={state.runId}
        hasReport={!!state.report}
        onViewReport={() => setShowReport(true)}
        onNewAnalysis={() => {
          demoCleanupRef.current?.();
          demoCleanupRef.current = null;
          setIsDemo(false);
          dispatch({ type: "RESET" });
          setPitchFile(null);
          setPitchContext(null);
        }}
      />

      {/* Accent line divider */}
      <div className="accent-line" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Activity Feed */}
        <div className="w-[42%] border-r border-border overflow-hidden">
          <ActivityFeed entries={state.activityLog} />
        </div>

        {/* Right: Workspace */}
        <div className="w-[58%] overflow-hidden">
          <Workspace tasks={state.tasks} scratchpadFiles={state.scratchpadFiles} />
        </div>
      </div>

      {showReport && state.report && state.runId && (
        <ReportOverlay
          report={state.report as import("@/lib/types").ReportData}
          runId={state.runId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
