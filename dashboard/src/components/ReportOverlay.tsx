"use client";

import { useRef } from "react";
import type { ReportData } from "@/lib/types";
import { ReportKVSection, ReportTableSection } from "./ReportSection";

interface Props {
  report: ReportData;
  runId: string;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportOverlay({ report, runId, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintPDF = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const companyName = report.executive_summary?.company_name || "Company";
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const yr = new Date().getFullYear();

    w.document.write(`<!DOCTYPE html><html><head><title>${companyName} — /cic Due Diligence</title>
<style>
  @page { margin: 0.7in 0.9in 0.9in 0.9in; size: letter; }
  @page :first { margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #222; background: white; font-size: 10.5pt; line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── Cover ── */
  .cover { page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 3in 1.2in 1.5in; background: #fafaf7; }
  .cover-top { }
  .cover-logo { display: flex; align-items: center; gap: 6px; margin-bottom: 80px; }
  .cover-logo .sl { font-size: 48px; font-weight: 200; color: #F97316; line-height: 0.8; }
  .cover-logo .nm { font-size: 11px; font-weight: 900; color: #222; letter-spacing: -0.02em; }
  .cover h1 { font-size: 42px; font-weight: 800; color: #111; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 12px; }
  .cover .subtitle { font-size: 15px; color: #F97316; font-weight: 500; margin-bottom: 40px; }
  .cover .meta { font-size: 10px; color: #999; line-height: 1.8; }
  .cover .meta span { display: block; }
  .cover-bottom { border-top: 1px solid #e0e0da; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .cover-bottom .left { font-size: 9px; color: #bbb; text-transform: uppercase; letter-spacing: 0.15em; }
  .cover-bottom .right { font-size: 9px; color: #ccc; }

  /* ── Page header/footer ── */
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding-bottom: 12px; border-bottom: 2px solid #111; }
  .page-header .logo { display: flex; align-items: center; gap: 3px; }
  .page-header .logo .sl { font-size: 18px; font-weight: 200; color: #F97316; line-height: 1; }
  .page-header .logo .nm { font-size: 9px; font-weight: 900; color: #222; }
  .page-header .company-name { font-size: 9px; color: #888; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }

  /* ── Sections ── */
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  .section-title { font-size: 16px; font-weight: 800; color: #111; letter-spacing: -0.03em; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #e8e8e2; }
  .section-title .num { color: #F97316; font-weight: 200; font-size: 14px; margin-right: 6px; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 8px; }
  thead { }
  th { text-align: left; padding: 8px 10px; background: #111; color: white; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; }
  th:first-child { border-radius: 4px 0 0 0; }
  th:last-child { border-radius: 0 4px 0 0; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0efe8; color: #444; vertical-align: top; }
  tr:nth-child(even) td { background: #fafaf5; }
  tr:hover td { background: #f5f4ee; }

  /* ── KV pairs ── */
  .kv-grid { display: grid; grid-template-columns: 200px 1fr; gap: 0; margin-top: 8px; }
  .kv-row { display: contents; }
  .kv-key { padding: 10px 16px 10px 0; font-weight: 800; color: #555; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f0efe8; }
  .kv-val { padding: 10px 0; color: #222; font-size: 10.5pt; line-height: 1.6; border-bottom: 1px solid #f0efe8; font-weight: 400; }

  /* ── Back page ── */
  .back-page { page-break-before: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: #fafaf7; }
  .back-page .sl { font-size: 96px; font-weight: 200; color: #F97316; line-height: 1; }
  .back-page .nm { font-size: 18px; font-weight: 900; color: #222; margin-top: -12px; letter-spacing: -0.02em; }
  .back-page .full { font-size: 11px; color: #aaa; margin-top: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
  .back-page .disc { font-size: 8px; color: #ccc; margin-top: 48px; max-width: 400px; line-height: 1.6; }

  /* ── Inline citations ── */
  sup { color: #F97316; font-weight: 600; font-size: 7pt; vertical-align: super; margin-left: 1px; }

  /* ── Sources ── */
  .sources { margin-top: 36px; page-break-before: always; }
  .sources h3 { font-size: 16px; font-weight: 800; color: #111; letter-spacing: -0.03em; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e8e8e2; }
  .sources h3 .sl { color: #F97316; font-weight: 200; font-size: 14px; margin-right: 6px; }
  .sources ol { list-style: none; counter-reset: src; padding: 0; }
  .sources li { counter-increment: src; display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f5f4ee; font-size: 9pt; line-height: 1.5; }
  .sources li::before { content: counter(src) "."; color: #bbb; font-size: 8pt; width: 20px; text-align: right; flex-shrink: 0; padding-top: 1px; }
  .sources a { color: #F97316; text-decoration: none; font-weight: 500; }
  .sources .meta { color: #999; font-size: 8pt; margin-left: 4px; }
</style></head><body>`);

    // ── Cover page
    w.document.write(`
      <div class="cover">
        <div class="cover-top">
          <div class="cover-logo"><span class="sl">/</span><span class="nm">cic</span></div>
          <h1>${companyName}</h1>
          <div class="subtitle">Investment Due Diligence Report</div>
          <div class="meta">
            <span>Prepared by Chicago Intelligence Company</span>
            <span>${dateStr}</span>
          </div>
        </div>
        <div class="cover-bottom">
          <div class="left">Confidential</div>
          <div class="right">chicagointelligence.com</div>
        </div>
      </div>
    `);

    // ── Content pages with header
    w.document.write(`
      <div class="page-header">
        <div class="logo"><span class="sl">/</span><span class="nm">cic</span></div>
        <div class="company-name">${companyName}</div>
      </div>
    `);
    w.document.write(el.innerHTML);

    // ── Sources page
    if (report.sources && report.sources.length > 0) {
      w.document.write('<div class="sources"><h3><span class="sl">/</span> Sources & References</h3><ol>');
      report.sources.forEach(src => {
        w.document.write(`<li><div><a href="${src.url}">${src.title || src.url}</a>`);
        if (src.section) w.document.write(`<span class="meta">(${src.section})</span>`);
        if (src.accessed) w.document.write(`<span class="meta">Accessed ${src.accessed}</span>`);
        w.document.write('</div></li>');
      });
      w.document.write('</ol></div>');
    }

    // ── Back page
    w.document.write(`
      <div class="back-page">
        <div class="sl">/</div>
        <div class="nm">cic</div>
        <div class="full">Chicago Intelligence Company</div>
        <div class="disc">
          This report was generated autonomously using AI-powered research tools.
          All findings are sourced from publicly available data. Unverifiable claims
          are explicitly marked. This report does not constitute investment advice.
        </div>
      </div>
    `);

    w.document.write('</body></html>');
    w.document.close();
    setTimeout(() => { w.print(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#f5f5f0] rounded-xl border border-neutral-200 shadow-[0_8px_60px_rgba(0,0,0,0.12)] flex flex-col">
        {/* Header — / cic branded */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-neutral-200 bg-white/60 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[20px] font-extralight text-[#F97316] leading-none">/</span>
              <span className="text-[13px] font-black tracking-[-0.02em] text-neutral-800">cic</span>
              <span className="w-px h-4 bg-neutral-200" />
              <h2 className="text-sm font-semibold tracking-wide text-neutral-800">
                Investment Analysis
              </h2>
            </div>
            {report.executive_summary?.company_name && (
              <p className="text-xl font-light text-accent ml-[52px]">
                {report.executive_summary.company_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* PDF button */}
            <button
              onClick={handlePrintPDF}
              className="px-4 py-1.5 rounded-lg bg-[#F97316] text-white text-[10px] font-semibold tracking-[0.15em] uppercase hover:shadow-[0_2px_12px_rgba(249,115,22,0.3)] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v8M3 6l3 3 3-3" />
                <path d="M1 10h10" />
              </svg>
              PDF
            </button>
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
            <div className="w-px h-4 bg-border hidden sm:block" />
            {["xlsx", "csv", "json"].map((fmt) => (
              <a
                key={fmt}
                href={`${API_BASE}/api/download/${runId}/${fmt}`}
                className="px-3.5 py-1.5 rounded-lg bg-bg-card border border-border text-[10px] font-semibold text-text-dim tracking-[0.15em] uppercase hover:text-accent hover:border-accent/30 transition-all duration-200 hidden sm:inline-block"
              >
                {fmt}
              </a>
            ))}
            <button
              onClick={onClose}
              className="ml-1 sm:ml-3 w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-text-dim transition-all cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Report content — paper grey background */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 bg-[#f5f5f0]">
          {/* Hidden print-ready content (used by PDF export) */}
          <div ref={printRef} className="print-content">
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

            {/* Sources & References */}
            {report.sources && report.sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <h3 className="text-[13px] font-bold text-neutral-800 mb-4 tracking-[-0.01em]">
                  <span className="text-[#F97316] font-extralight text-[15px] mr-1">/</span>
                  Sources & References
                </h3>
                <ol className="space-y-2">
                  {report.sources.map((src, i) => (
                    <li key={i} className="flex items-start gap-3 text-[11px] leading-relaxed">
                      <span className="text-neutral-300 font-light shrink-0 w-5 text-right tabular-nums">{i + 1}.</span>
                      <div>
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[#F97316] hover:underline font-medium">
                          {src.title || src.url}
                        </a>
                        {src.section && <span className="text-neutral-400 ml-2">({src.section})</span>}
                        {src.accessed && <span className="text-neutral-300 ml-2">Accessed {src.accessed}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer — / cic branded */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-t border-neutral-200 bg-white/60 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-extralight text-[#F97316] leading-none">/</span>
            <span className="text-[11px] font-black tracking-[-0.02em] text-neutral-800">cic</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-light">Chicago Intelligence Company</span>
        </div>
      </div>
    </div>
  );
}
