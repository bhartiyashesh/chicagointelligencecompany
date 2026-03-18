"use client";

import type { ReportData } from "@/lib/types";
import { ReportKVSection, ReportTableSection } from "./ReportSection";

interface Props {
  report: ReportData;
  runId: string;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportOverlay({ report, runId, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] bg-bg-primary rounded-xl border border-border shadow-[0_0_60px_rgba(212,255,81,0.05)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-4 bg-accent rounded-full" />
              <h2 className="text-sm font-semibold tracking-wide text-text-primary">
                Investment Analysis
              </h2>
            </div>
            {report.executive_summary?.company_name && (
              <p className="text-xl font-light text-accent ml-4">
                {report.executive_summary.company_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${API_BASE}/api/download-all/${runId}`}
              className="px-4 py-1.5 rounded-lg border border-accent/30 text-accent text-[10px] font-semibold tracking-[0.15em] uppercase hover:bg-accent/10 transition-all duration-200 flex items-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v8M3 6l3 3 3-3" />
                <path d="M1 10h10" />
              </svg>
              All
            </a>
            <div className="w-px h-4 bg-border" />
            {["xlsx", "csv", "json"].map((fmt) => (
              <a
                key={fmt}
                href={`${API_BASE}/api/download/${runId}/${fmt}`}
                className="px-3.5 py-1.5 rounded-lg bg-bg-card border border-border text-[10px] font-semibold text-text-dim tracking-[0.15em] uppercase hover:text-accent hover:border-accent/30 transition-all duration-200"
              >
                {fmt}
              </a>
            ))}
            <button
              onClick={onClose}
              className="ml-3 w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-text-dim transition-all cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Report content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {report.executive_summary && (
            <ReportKVSection title="Executive Summary" data={report.executive_summary} />
          )}
          {report.leadership_team && report.leadership_team.length > 0 && (
            <ReportTableSection title="Leadership Team" data={report.leadership_team} />
          )}
          {report.market_analysis && report.market_analysis.length > 0 && (
            <ReportTableSection title="Market Analysis" data={report.market_analysis} />
          )}
          {report.product_positioning && (
            <ReportKVSection title="Product & Positioning" data={report.product_positioning} />
          )}
          {report.traction_metrics && report.traction_metrics.length > 0 && (
            <ReportTableSection title="Traction Metrics" data={report.traction_metrics} />
          )}
          {report.competitive_landscape && report.competitive_landscape.length > 0 && (
            <ReportTableSection title="Competitive Landscape" data={report.competitive_landscape} />
          )}
          {report.financial_analysis && (
            <ReportKVSection title="Financial Analysis" data={report.financial_analysis} />
          )}
          {report.risk_assessment && report.risk_assessment.length > 0 && (
            <ReportTableSection title="Risk Assessment" data={report.risk_assessment} />
          )}
          {report.investment_recommendation && (
            <ReportKVSection title="Investment Recommendation" data={report.investment_recommendation} />
          )}
        </div>

        {/* Footer accent */}
        <div className="accent-line" />
      </div>
    </div>
  );
}
