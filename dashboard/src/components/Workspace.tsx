"use client";

import type { TaskInfo } from "@/lib/types";
import TaskPlan from "./TaskPlan";
import ScratchpadPanel from "./ScratchpadPanel";

interface Props {
  tasks: TaskInfo[];
  scratchpadFiles: Record<string, { content: string; charCount: number }>;
}

export default function Workspace({ tasks, scratchpadFiles }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Task Plan */}
      <div className="border-b border-border shrink-0">
        <TaskPlan tasks={tasks} />
      </div>

      {/* Scratchpad */}
      <div className="flex-1 overflow-hidden">
        <ScratchpadPanel files={scratchpadFiles} />
      </div>
    </div>
  );
}
