"use client";

interface KVProps {
  title: string;
  data: Record<string, string>;
}

export function ReportKVSection({ title, data }: KVProps) {
  const entries = Object.entries(data).filter(([, v]) => v && v !== "Not available");

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          {title}
        </h3>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="space-y-0">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-6 py-2.5 border-b border-border-subtle group hover:bg-bg-hover/30 transition-colors px-2">
            <span className="text-[11px] font-medium text-text-dim w-52 shrink-0 capitalize tracking-wide">
              {key.replace(/_/g, " ")}
            </span>
            <span className="text-[13px] text-text-primary font-light leading-relaxed">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TableProps {
  title: string;
  data: Array<Record<string, string>>;
}

export function ReportTableSection({ title, data }: TableProps) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          {title}
        </h3>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-elevated">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-[0.15em] border-b border-border"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={`hover:bg-bg-hover/30 transition-colors ${i % 2 === 1 ? "bg-bg-card/30" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2.5 text-[13px] text-text-secondary border-b border-border-subtle font-light">
                    {row[col] || "\u2014"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
