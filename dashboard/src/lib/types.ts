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

// ─── Supply Chain Types ─────────────────────────────────

export type SupplyChainSourceType =
  | "SEC_EDGAR" | "SEARCH_ENGINE" | "NEWS_SCRAPER" | "MARKET_DATA"
  | "TRADE_DATA" | "ECONOMIC_DATA" | "LOGISTICS_DATA" | "WEATHER_DATA"
  | "INTERNAL_MODEL" | "SOCIAL_SENTIMENT";

export interface IntelligenceFinding {
  id: string;
  source_type: SupplyChainSourceType;
  finding_summary: string;
  raw_data_preview?: string;
  timestamp: number;
  tool_name: string;
}

export interface SynthesisEntry {
  stage: "initial_hypothesis" | "key_observation" | "critical_finding" | "model_data";
  title: string;
  content: string;
  timestamp: number;
}

export interface SupplyChainDashboardState {
  status: "idle" | "connecting" | "running" | "complete" | "error";
  company: string;
  runId: string | null;
  turn: number;
  totalSearches: number;
  totalTokens: number;
  estimatedCost: number;
  tasks: TaskInfo[];
  activityLog: ActivityEntry[];
  intelligenceFindings: IntelligenceFinding[];
  synthesisNotebook: SynthesisEntry[];
  report: SupplyChainReportData | null;
  reportPaths: { xlsx: string; csv: string; json: string } | null;
  error: string | null;
}

export interface SupplyChainReportData {
  executive_summary?: Record<string, string>;
  supplier_map?: Array<Record<string, string>>;
  geographic_risk?: Record<string, string>;
  dependency_analysis?: Array<Record<string, string>>;
  logistics_infrastructure?: Record<string, string>;
  trade_regulatory_risk?: Record<string, string>;
  competitive_displacement?: Array<Record<string, string>>;
  scenarios?: Array<Record<string, string>>;
  recommendations?: Record<string, string>;
  sources?: ReportSource[];
}
