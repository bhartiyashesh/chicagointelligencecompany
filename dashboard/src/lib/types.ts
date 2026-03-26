// ─── Agent Events (from WebSocket) ─────────────────────

export type AgentEventType =
  | "agent_started"
  | "turn_started"
  | "plan_created"
  | "task_updated"
  | "search_initiated"
  | "search_completed"
  | "tool_called"
  | "tool_result"
  | "scratchpad_saved"
  | "text_generated"
  | "usage_tracked"
  | "exit_gate_triggered"
  | "api_error"
  | "agent_finished"
  | "report_ready"
  | "report_error"
  | "ping"
  | "stream_end";

export interface AgentEvent {
  type: AgentEventType;
  timestamp?: number;
  [key: string]: unknown;
}

export interface TaskInfo {
  index: number;
  task: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
}

// ─── Activity Feed ──────────────────────────────────────

export interface ActivityEntry {
  id: string;
  type: AgentEventType;
  text: string;
  detail?: string;
  timestamp: number;
  icon: "search" | "result" | "tool" | "text" | "task" | "file" | "error" | "gate" | "info";
}

// ─── Dashboard State ────────────────────────────────────

export interface DashboardState {
  status: "idle" | "connecting" | "running" | "complete" | "error";
  company: string;
  runId: string | null;
  turn: number;
  totalSearches: number;
  totalTokens: number;
  estimatedCost: number;
  tasks: TaskInfo[];
  activityLog: ActivityEntry[];
  scratchpadFiles: Record<string, { content: string; charCount: number }>;
  report: Record<string, unknown> | null;
  reportPaths: { xlsx: string; csv: string; json: string } | null;
  error: string | null;
}

// ─── Report structure ───────────────────────────────────

export interface ReportSource {
  url: string;
  title: string;
  section: string;
  accessed?: string;
}

export interface ReportData {
  executive_summary?: Record<string, string>;
  leadership_team?: Array<Record<string, string>>;
  team_size?: string;
  team_breakdown?: string;
  market_analysis?: Array<Record<string, string>>;
  product_positioning?: Record<string, string>;
  traction_metrics?: Array<Record<string, string>>;
  competitive_landscape?: Array<Record<string, string>>;
  financial_analysis?: Record<string, string>;
  risk_assessment?: Array<Record<string, string>>;
  investment_recommendation?: Record<string, string>;
  sources?: ReportSource[];
}
