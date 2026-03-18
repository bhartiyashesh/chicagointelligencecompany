"use client";

import { useRef, useEffect, useState } from "react";
import type { ActivityEntry as EntryType } from "@/lib/types";
import ActivityEntryComponent from "./ActivityEntry";

interface Props {
  entries: EntryType[];
}

export default function ActivityFeed({ entries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-accent animate-dot-pulse" />
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-text-dim">
            Activity Log
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-dim">{entries.length}</span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {entries.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-xs text-text-dim font-mono">
              Awaiting agent initialization...
            </div>
          </div>
        ) : (
          entries.map((entry) => (
            <ActivityEntryComponent key={entry.id} entry={entry} />
          ))
        )}
      </div>

      {!autoScroll && entries.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="mx-4 mb-3 py-1.5 text-[10px] text-center text-accent font-mono tracking-wider uppercase bg-accent/5 border border-accent/20 rounded hover:bg-accent/10 transition-colors cursor-pointer"
        >
          scroll to latest
        </button>
      )}
    </div>
  );
}
