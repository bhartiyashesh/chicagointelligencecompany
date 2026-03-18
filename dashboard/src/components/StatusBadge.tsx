"use client";

interface Props {
  status: "idle" | "connecting" | "running" | "complete" | "error";
}

export default function StatusBadge({ status }: Props) {
  const config = {
    idle: { color: "bg-text-dim", text: "Standby", pulse: false },
    connecting: { color: "bg-warning", text: "Connecting", pulse: true },
    running: { color: "bg-accent", text: "Active", pulse: true },
    complete: { color: "bg-success", text: "Complete", pulse: false },
    error: { color: "bg-error", text: "Error", pulse: false },
  };

  const { color, text, pulse } = config[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-bg-elevated">
      <div className={`w-1.5 h-1.5 rounded-full ${color} ${pulse ? "animate-dot-pulse" : ""}`} />
      <span className="text-[10px] font-medium tracking-widest uppercase text-text-secondary">
        {text}
      </span>
    </div>
  );
}
