"use client";

import React from "react";

// ─── Inline citation renderer ────────────────────────────
// Converts "[1]", "[2][3]" etc in text to orange superscript links
function renderWithCitations(text: string): React.ReactNode {
  const parts = text.split(/(\[\d+\])/g);
  if (parts.length === 1) return formatValue(text);

  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <sup
          key={i}
          className="text-[#F97316] font-semibold text-[9px] ml-0.5 cursor-default hover:underline"
          title={`Source ${match[1]}`}
        >
          [{match[1]}]
        </sup>
      );
    }
    return <React.Fragment key={i}>{formatValue(part)}</React.Fragment>;
  });
}

// ─── Smart value formatter ───────────────────────────────
// Detects multi-line content, bullet points, and formats accordingly
function formatValue(text: string): React.ReactNode {
  if (!text) return text;

  // If the value contains bullet points or newlines, format as a list
  const lines = text.split(/\n/);
  if (lines.length > 1) {
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          // Check if it's a bullet point
          const bulletMatch = trimmed.match(/^[-•*]\s*(.*)/);
          if (bulletMatch) {
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#F97316] mt-[3px] text-[8px]">●</span>
                <span>{highlightKeyTerms(bulletMatch[1])}</span>
              </div>
            );
          }
          return <div key={i}>{highlightKeyTerms(trimmed)}</div>;
        })}
      </div>
    );
  }

  return highlightKeyTerms(text);
}

// ─── Highlight key terms in values ───────────────────────
// Makes important terms like dollar amounts, percentages, ratings stand out
function highlightKeyTerms(text: string): React.ReactNode {
  // Pattern matches: dollar amounts, percentages, ratings (BUY/SELL/HOLD), dates
  const pattern = /(\$[\d,.]+[BMKbmk]?|\d+(?:\.\d+)?%|(?:BUY|SELL|HOLD|STRONG BUY|STRONG SELL|PASS|INVEST|MODERATE INTEREST|HIGH|MEDIUM|LOW|CRITICAL)\b|\b(?:Series [A-F]|Seed|Pre-Seed|IPO)\b)/gi;

  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (pattern.test(part)) {
      // Reset lastIndex since we're using global flag
      pattern.lastIndex = 0;

      // Color-code ratings
      const upper = part.toUpperCase();
      if (["BUY", "STRONG BUY", "INVEST"].includes(upper)) {
        return <span key={i} className="font-bold text-emerald-600">{part}</span>;
      }
      if (["SELL", "STRONG SELL", "PASS"].includes(upper)) {
        return <span key={i} className="font-bold text-red-500">{part}</span>;
      }
      if (["HOLD", "MODERATE INTEREST"].includes(upper)) {
        return <span key={i} className="font-bold text-amber-600">{part}</span>;
      }
      if (["HIGH", "CRITICAL"].includes(upper)) {
        return <span key={i} className="font-bold text-red-500">{part}</span>;
      }
      if (upper === "MEDIUM") {
        return <span key={i} className="font-bold text-amber-600">{part}</span>;
      }
      if (upper === "LOW") {
        return <span key={i} className="font-bold text-emerald-600">{part}</span>;
      }

      // Dollar amounts & percentages
      return <span key={i} className="font-semibold text-neutral-900">{part}</span>;
    }
    // Reset lastIndex
    pattern.lastIndex = 0;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ─── Pretty key formatter ────────────────────────────────
function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bCeo\b/gi, "CEO")
    .replace(/\bCto\b/gi, "CTO")
    .replace(/\bCfo\b/gi, "CFO")
    .replace(/\bCoo\b/gi, "COO")
    .replace(/\bVp\b/gi, "VP")
    .replace(/\bRoi\b/gi, "ROI")
    .replace(/\bIpo\b/gi, "IPO")
    .replace(/\bM&a\b/gi, "M&A")
    .replace(/\bYoy\b/gi, "YoY")
    .replace(/\bMom\b/gi, "MoM")
    .replace(/\bArr\b/gi, "ARR")
    .replace(/\bMrr\b/gi, "MRR")
    .replace(/\bEbitda\b/gi, "EBITDA")
    .replace(/\bP&l\b/gi, "P&L")
    .replace(/\bTam\b/gi, "TAM")
    .replace(/\bSam\b/gi, "SAM")
    .replace(/\bSom\b/gi, "SOM")
    .replace(/\bUrl\b/gi, "URL");
}

// ─── Section icon selector ──────────────────────────────
function SectionIcon({ title }: { title: string }) {
  const t = title.toLowerCase();

  if (t.includes("executive") || t.includes("summary")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  }
  if (t.includes("leader") || t.includes("team")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (t.includes("market")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" />
      </svg>
    );
  }
  if (t.includes("product") || t.includes("positioning")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    );
  }
  if (t.includes("financial") || t.includes("traction")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    );
  }
  if (t.includes("risk")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (t.includes("competitive") || t.includes("landscape")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    );
  }
  if (t.includes("invest") || t.includes("recommend")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#F97316]">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  return <div className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />;
}

interface KVProps {
  title: string;
  data: Record<string, string>;
}

export function ReportKVSection({ title, data }: KVProps) {
  const entries = Object.entries(data).filter(([, v]) => v && v !== "Not available");

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5">
        <SectionIcon title={title} />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-800">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent" />
      </div>

      {/* Key-value grid */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {entries.map(([key, value], i) => (
          <div
            key={key}
            className={`flex gap-6 py-3.5 px-5 group hover:bg-neutral-50/80 transition-colors ${
              i < entries.length - 1 ? "border-b border-neutral-100" : ""
            }`}
          >
            <span className="text-[11px] font-bold text-neutral-500 w-48 shrink-0 pt-0.5 tracking-wide">
              {formatKey(key)}
            </span>
            <span className="text-[13px] text-neutral-800 leading-relaxed flex-1">
              {renderWithCitations(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TableProps {
  title: string;
  data: Array<Record<string, string>>;
}

export function ReportTableSection({ title, data }: TableProps) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5">
        <SectionIcon title={title} />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-800">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-neutral-200 to-transparent" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-5 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em] border-b-2 border-neutral-100 bg-neutral-50/50"
                >
                  {formatKey(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-neutral-50/80 transition-colors"
              >
                {columns.map((col, ci) => (
                  <td
                    key={col}
                    className={`px-5 py-3.5 text-[13px] text-neutral-700 leading-relaxed ${
                      i < data.length - 1 ? "border-b border-neutral-100" : ""
                    } ${ci === 0 ? "font-semibold text-neutral-900" : ""}`}
                  >
                    {row[col] ? renderWithCitations(row[col]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
