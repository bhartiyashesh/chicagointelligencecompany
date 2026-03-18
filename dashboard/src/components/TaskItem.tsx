"use client";

import type { TaskInfo } from "@/lib/types";

interface Props {
  task: TaskInfo;
}

const statusConfig = {
  pending:     { symbol: "\u2500", color: "text-text-dim", line: "" },
  in_progress: { symbol: "\u25B6", color: "text-accent",  line: "" },
  completed:   { symbol: "\u2714", color: "text-success",  line: "line-through opacity-50" },
  blocked:     { symbol: "\u2716", color: "text-error",    line: "opacity-50" },
};

export default function TaskItem({ task }: Props) {
  const { symbol, color, line } = statusConfig[task.status];

  return (
    <div
      className={`flex items-start gap-2.5 py-1.5 px-3 rounded text-sm animate-fade-in transition-colors duration-200 ${
        task.status === "in_progress" ? "bg-accent/5 border-l-2 border-accent" : "border-l-2 border-transparent"
      }`}
    >
      <span className={`${color} font-mono text-[11px] mt-0.5 w-3 shrink-0`}>{symbol}</span>
      <span className={`text-[13px] text-text-secondary font-light ${line}`}>
        {task.task}
      </span>
    </div>
  );
}
