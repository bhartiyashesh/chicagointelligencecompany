"use client";

import type { TaskInfo } from "@/lib/types";
import ProgressBar from "./ProgressBar";
import TaskItem from "./TaskItem";

interface Props {
  tasks: TaskInfo[];
}

export default function TaskPlan({ tasks }: Props) {
  const done = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-accent" />
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-text-dim">
            Research Plan
          </span>
        </div>
      </div>
      {tasks.length === 0 ? (
        <div className="text-xs text-text-dim font-mono py-2">
          Awaiting plan generation...
        </div>
      ) : (
        <>
          <ProgressBar done={done} total={tasks.length} />
          <div className="mt-3 space-y-0.5 max-h-52 overflow-y-auto">
            {tasks.map((task) => (
              <TaskItem key={task.index} task={task} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
