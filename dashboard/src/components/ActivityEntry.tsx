"use client";

import { useState } from "react";
import { formatTimestamp, truncate } from "@/lib/format";
import type { ActivityEntry as EntryType } from "@/lib/types";

const iconConfig: Record<EntryType["icon"], { symbol: string; color: string; bg: string }> = {
  search:  { symbol: "\u2192", color: "text-accent",       bg: "bg-accent/10" },
  result:  { symbol: "\u2190", color: "text-accent/70",    bg: "bg-accent/5" },
  tool:    { symbol: "\u25C6", color: "text-info",          bg: "bg-info/10" },
  text:    { symbol: "\u2502", color: "text-text-dim",      bg: "" },
  task:    { symbol: "\u2714", color: "text-success",       bg: "bg-success/10" },
  file:    { symbol: "\u25A0", color: "text-warning",       bg: "bg-warning/10" },
  error:   { symbol: "\u2716", color: "text-error",         bg: "bg-error/10" },
  gate:    { symbol: "\u25B7", color: "text-warning",       bg: "bg-warning/5" },
  info:    { symbol: "\u2500", color: "text-text-secondary", bg: "" },
};

interface Props {
  entry: EntryType;
}

export default function ActivityEntryComponent({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = iconConfig[entry.icon] || iconConfig.info;
  const isLong = entry.text.length > 100;
  const displayText = expanded ? entry.text : truncate(entry.text, 100);

  return (
    <div className={`group flex items-start gap-2.5 py-2 px-4 hover:bg-bg-hover/50 animate-fade-in-up transition-colors duration-150 ${config.bg}`}>
      <span className={`${config.color} font-mono text-xs mt-0.5 w-3 shrink-0 text-center`}>
        {config.symbol}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-mono text-text-secondary leading-relaxed">
          {displayText}
        </span>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1.5 text-[10px] text-accent/60 hover:text-accent transition-colors cursor-pointer"
          >
            [{expanded ? "collapse" : "expand"}]
          </button>
        )}
        {entry.detail && (
          <div className="text-[11px] text-text-dim mt-0.5 font-mono">{entry.detail}</div>
        )}
      </div>
      <span className="text-[9px] text-text-dim shrink-0 mt-1 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );
}
