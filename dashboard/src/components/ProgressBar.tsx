"use client";

interface Props {
  done: number;
  total: number;
}

export default function ProgressBar({ done, total }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-[3px] rounded-full bg-bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            boxShadow: pct > 0 ? "0 0 8px rgba(212,255,81,0.4)" : "none",
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-accent whitespace-nowrap">
        {done}/{total}
      </span>
    </div>
  );
}
