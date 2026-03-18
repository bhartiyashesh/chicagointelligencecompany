"use client";

import { useState, useEffect } from "react";

interface Props {
  files: Record<string, { content: string; charCount: number }>;
}

export default function ScratchpadPanel({ files }: Props) {
  const filenames = Object.keys(files);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (filenames.length > 0) {
      setActiveTab(filenames[filenames.length - 1]);
    }
  }, [filenames.length]);

  if (filenames.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-1 rounded-full bg-accent/40" />
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-text-dim">
            Workspace
          </span>
        </div>
        <div className="text-xs text-text-dim font-mono">
          Research artifacts will materialize here...
        </div>
      </div>
    );
  }

  const activeContent = activeTab ? files[activeTab]?.content : "";

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-1 h-1 rounded-full bg-accent" />
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-text-dim">
            Workspace
          </span>
          <span className="text-[10px] font-mono text-text-dim ml-auto">
            {filenames.length} {filenames.length === 1 ? "file" : "files"}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {filenames.map((fn) => (
            <button
              key={fn}
              onClick={() => setActiveTab(fn)}
              className={`px-3 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === fn
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-text-dim hover:text-text-secondary border border-transparent hover:border-border"
              }`}
            >
              {fn}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-[12px] font-mono text-text-secondary whitespace-pre-wrap leading-[1.7]">
          {activeContent}
        </pre>
      </div>
    </div>
  );
}
