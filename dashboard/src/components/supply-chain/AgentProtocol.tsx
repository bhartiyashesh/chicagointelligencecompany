"use client";

import type { TaskInfo } from "@/lib/types";

interface Props {
  tasks: TaskInfo[];
  status: "idle" | "connecting" | "running" | "complete" | "error";
  company: string;
}

function formatTimestamp(ts?: number): string {
  if (!ts) return "";
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AgentProtocol({ tasks, status, company }: Props) {
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const descriptions: Record<string, string> = {
    connecting: "Initializing intelligence gathering protocol...",
    running: "Cross-referencing global logistics chains, supplier networks, and trade dependencies...",
    complete: "Analysis protocol complete. All intelligence gathered.",
    error: "Protocol encountered an error.",
    idle: "Awaiting target company...",
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-neutral-800">
        <h2 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-1.5">
          Agent Protocol
        </h2>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          {descriptions[status]}
        </p>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-neutral-500 tracking-wider uppercase">
                Progress
              </span>
              <span className="text-[10px] font-mono text-[#F97316]">
                {completed}/{total} ({Math.round(progress)}%)
              </span>
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {tasks.map((task) => (
          <div
            key={task.index}
            className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-neutral-900/50 transition-colors"
          >
            {/* Status icon */}
            <div className="mt-0.5 shrink-0">
              {task.status === "completed" && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#10B981" strokeWidth="1.5" />
                  <path d="M4.5 7L6.5 9L9.5 5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {task.status === "in_progress" && (
                <div className="w-3.5 h-3.5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
                </div>
              )}
              {task.status === "pending" && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#404040" strokeWidth="1.5" />
                </svg>
              )}
              {task.status === "blocked" && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#EF4444" strokeWidth="1.5" />
                  <path d="M5 5l4 4M9 5l-4 4" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>

            {/* Task text */}
            <div className="flex-1 min-w-0">
              <span
                className={`text-[11px] font-mono leading-snug block ${
                  task.status === "completed"
                    ? "text-neutral-500 line-through"
                    : task.status === "in_progress"
                    ? "text-white"
                    : task.status === "blocked"
                    ? "text-red-400"
                    : "text-neutral-600"
                }`}
              >
                {task.task}
              </span>
            </div>
          </div>
        ))}

        {tasks.length === 0 && status !== "idle" && (
          <div className="text-center py-8">
            <div className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse mx-auto mb-3" />
            <p className="text-[11px] text-neutral-600 font-mono">
              Generating research plan...
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            status === "running" ? "bg-[#F97316] animate-pulse" :
            status === "complete" ? "bg-[#10B981]" :
            status === "error" ? "bg-red-500" :
            "bg-neutral-600"
          }`} />
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
            {company || "No target"}
          </span>
        </div>
      </div>
    </div>
  );
}
