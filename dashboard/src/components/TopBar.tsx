"use client";

import StatusBadge from "./StatusBadge";
import StatsRow from "./StatsRow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  company: string;
  status: "idle" | "connecting" | "running" | "complete" | "error";
  turn: number;
  searches: number;
  tokens: number;
  cost: number;
  runId: string | null;
  onViewReport?: () => void;
  onNewAnalysis?: () => void;
  hasReport: boolean;
}

export default function TopBar({
  company,
  status,
  turn,
  searches,
  tokens,
  cost,
  runId,
  onViewReport,
  onNewAnalysis,
  hasReport,
}: Props) {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-bg-primary shrink-0">
      {/* Left: Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-accent rounded-full" />
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-text-secondary">
            CIC
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <h1 className="text-sm font-light text-text-primary tracking-wide">
          <span className="text-accent font-medium">{company}</span>
        </h1>
        <StatusBadge status={status} />
      </div>

      {/* Right: Stats + Actions */}
      <div className="flex items-center gap-3">
        {status !== "idle" && (
          <StatsRow turn={turn} searches={searches} tokens={tokens} cost={cost} />
        )}
        {hasReport && runId && (
          <>
            <a
              href={`${API_BASE}/api/download-all/${runId}`}
              className="px-4 py-1.5 rounded-lg border border-accent/30 text-accent text-[11px] font-semibold tracking-wider uppercase hover:bg-accent/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v8M3 6l3 3 3-3" />
                <path d="M1 10h10" />
              </svg>
              Download All
            </a>
            <button
              onClick={onViewReport}
              className="px-4 py-1.5 rounded-lg bg-accent text-bg-primary text-[11px] font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(212,255,81,0.3)] transition-all duration-200 cursor-pointer"
            >
              View Report
            </button>
          </>
        )}
        {(status === "error" || status === "complete") && (
          <button
            onClick={onNewAnalysis}
            className="px-4 py-1.5 rounded-lg border border-border text-text-secondary text-[11px] font-medium tracking-wider uppercase hover:border-accent/40 hover:text-accent transition-all duration-200 cursor-pointer"
          >
            New Analysis
          </button>
        )}
      </div>
    </header>
  );
}
