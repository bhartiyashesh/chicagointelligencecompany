"use client";

import type { SynthesisEntry } from "@/lib/types";

interface Props {
  entries: SynthesisEntry[];
  status: "idle" | "connecting" | "running" | "complete" | "error";
}

function StageIcon({ stage }: { stage: SynthesisEntry["stage"] }) {
  switch (stage) {
    case "initial_hypothesis":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </svg>
      );
    case "key_observation":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "critical_finding":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "model_data":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
  }
}

function stageLabel(stage: SynthesisEntry["stage"]): string {
  switch (stage) {
    case "initial_hypothesis": return "Initial Hypothesis";
    case "key_observation": return "Key Observation";
    case "critical_finding": return "Critical Finding";
    case "model_data": return "Modeling Sentiment Data";
  }
}

export default function SynthesisNotebook({ entries, status }: Props) {
  // Number key observations
  let obsCount = 0;
  const labeled = entries.map((entry) => {
    if (entry.stage === "key_observation") {
      obsCount++;
      return { ...entry, label: `Key Observation #${obsCount}` };
    }
    return { ...entry, label: stageLabel(entry.stage) };
  });

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-0.5">
              Synthesis Notebook
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[14px] font-extralight text-[#F97316] leading-none">/</span>
            <span className="text-[9px] font-black tracking-[-0.02em] text-neutral-400">cic</span>
          </div>
        </div>

        {/* Animated pen indicator */}
        {status === "running" && (
          <div className="flex items-center gap-2 mt-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              Synthesizing...
            </span>
          </div>
        )}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {labeled.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {status === "running" || status === "connecting" ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 animate-pulse">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <p className="text-[11px] text-neutral-600 font-mono">
                    Waiting for synthesis...
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-neutral-700 font-mono">
                  No synthesis entries yet
                </p>
              )}
            </div>
          </div>
        )}

        {labeled.map((entry, i) => (
          <div
            key={`${entry.stage}-${i}`}
            className="border-l-2 border-neutral-800 pl-4 py-1 animate-fade-in"
            style={{ borderColor: entry.stage === "critical_finding" ? "#EF4444" : "#262626" }}
          >
            {/* Stage header */}
            <div className="flex items-center gap-2 mb-2">
              <StageIcon stage={entry.stage} />
              <span className="text-[11px] font-bold text-[#F97316] uppercase tracking-wider">
                {entry.label}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-[13px] font-semibold text-neutral-200 mb-1.5 leading-snug">
              {entry.title}
            </h3>

            {/* Content */}
            <p className="text-[12px] text-neutral-400 leading-relaxed">
              {entry.content}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom writing indicator */}
      {status === "running" && entries.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1 h-1 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1 h-1 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">
              Agent is writing...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
