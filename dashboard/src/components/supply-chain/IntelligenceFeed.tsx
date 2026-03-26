"use client";

import { useRef, useEffect, useState } from "react";
import type { IntelligenceFinding } from "@/lib/types";
import SourceBadge from "./SourceBadge";

interface Props {
  findings: IntelligenceFinding[];
  status: "idle" | "connecting" | "running" | "complete" | "error";
}

function relativeTime(ts: number): string {
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 30) return "Just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function IntelligenceFeed({ findings, status }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLocked, setScrollLocked] = useState(true);

  // Auto-scroll to bottom when new findings arrive (if locked)
  useEffect(() => {
    if (scrollLocked && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [findings.length, scrollLocked]);

  // Detect manual scroll to unlock
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setScrollLocked(atBottom);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-0.5">
              Raw Intelligence Feed
            </h2>
            <p className="text-[10px] text-neutral-600">
              Live Stream
            </p>
          </div>
          {status === "running" && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
                Live
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {findings.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {status === "running" || status === "connecting" ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse mx-auto mb-3" />
                  <p className="text-[11px] text-neutral-600 font-mono">
                    Awaiting intelligence data...
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-neutral-700 font-mono">
                  No findings yet
                </p>
              )}
            </div>
          </div>
        )}

        {findings.map((finding, i) => (
          <div
            key={finding.id}
            className={`px-5 py-3.5 hover:bg-neutral-900/60 transition-colors ${
              i < findings.length - 1 ? "border-b border-neutral-800/60" : ""
            }`}
          >
            {/* Top row: badge + timestamp */}
            <div className="flex items-center justify-between mb-1.5">
              <SourceBadge source={finding.source_type} />
              <span className="text-[9px] font-mono text-neutral-600">
                {relativeTime(finding.timestamp)}
              </span>
            </div>

            {/* Finding summary */}
            <p className="text-[12px] text-neutral-300 leading-relaxed">
              {finding.finding_summary}
            </p>

            {/* Tool name */}
            <span className="text-[9px] font-mono text-neutral-700 mt-1 block">
              via {finding.tool_name}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="px-5 py-2.5 border-t border-neutral-800 flex items-center justify-between">
        {status === "running" && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1 h-1 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1 h-1 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">
              Agent is collecting...
            </span>
          </div>
        )}

        {!scrollLocked && (
          <button
            onClick={() => {
              setScrollLocked(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="ml-auto text-[9px] font-mono text-[#F97316] uppercase tracking-wider hover:text-[#FB923C] transition-colors cursor-pointer"
          >
            Scroll to latest
          </button>
        )}

        <span className="text-[9px] font-mono text-neutral-700 ml-auto">
          {findings.length} findings
        </span>
      </div>
    </div>
  );
}
