"use client";

import type { SupplyChainSourceType } from "@/lib/types";

const SOURCE_COLORS: Record<SupplyChainSourceType, string> = {
  SEC_EDGAR: "#3B82F6",
  SEARCH_ENGINE: "#8B5CF6",
  NEWS_SCRAPER: "#F59E0B",
  MARKET_DATA: "#10B981",
  TRADE_DATA: "#06B6D4",
  ECONOMIC_DATA: "#6366F1",
  LOGISTICS_DATA: "#F97316",
  WEATHER_DATA: "#0EA5E9",
  INTERNAL_MODEL: "#6B7280",
  SOCIAL_SENTIMENT: "#F43F5E",
};

interface Props {
  source: SupplyChainSourceType;
}

export default function SourceBadge({ source }: Props) {
  const color = SOURCE_COLORS[source] || "#6B7280";

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{
        backgroundColor: `${color}26`,
        color: color,
      }}
    >
      {source.replace(/_/g, " ")}
    </span>
  );
}
