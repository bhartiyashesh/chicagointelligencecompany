"use client";

import { formatTokens, formatCost } from "@/lib/format";

interface Props {
  turn: number;
  searches: number;
  tokens: number;
  cost: number;
}

export default function StatsRow({ turn, searches, tokens, cost }: Props) {
  const stats = [
    { label: "Cycle", value: String(turn) },
    { label: "Queries", value: String(searches) },
    { label: "Tokens", value: formatTokens(tokens) },
    { label: "Cost", value: formatCost(tokens, searches) },
  ];

  return (
    <div className="flex items-center gap-1">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1">
            <span className="text-[9px] uppercase tracking-[0.15em] text-text-dim">{s.label}</span>
            <span className="text-xs font-mono font-medium text-accent">{s.value}</span>
          </div>
          {i < stats.length - 1 && (
            <div className="w-px h-3 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}
