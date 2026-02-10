import { type MonitorTask } from "@/lib/api";

interface TaskTreeProps {
  tasks: MonitorTask[];
  selectedTaskId: number | null;
  onTaskSelect: (taskId: number | null) => void;
  collapsedTasks: Set<number>;
  onToggleCollapse: (taskId: number) => void;
  countRunsForTask: (task: MonitorTask) => number;
  totalRuns: number;
}

export function TaskTree({
  tasks,
  selectedTaskId,
  onTaskSelect,
  collapsedTasks,
  onToggleCollapse,
  countRunsForTask,
  totalRuns,
}: TaskTreeProps) {
  const renderTaskNode = (task: MonitorTask, depth: number) => {
    const hasChildren = task.children.length > 0;
    const isCollapsed = collapsedTasks.has(task.id);
    const isSelected = selectedTaskId === task.id;
    const runCount = countRunsForTask(task);

    return (
      <div key={task.id}>
        <div
          className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-xs select-none ${isSelected ? "bg-[rgba(14,99,156,0.22)]" : "hover:bg-white/[0.04]"}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => onTaskSelect(task.id)}
        >
          <span
            className="w-3.5 text-center text-white/50 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleCollapse(task.id); }}
          >
            {hasChildren ? (isCollapsed ? "▸" : "▾") : "•"}
          </span>
          <span className="text-[#d4d4d4]">タスク #{task.id}: {task.title}</span>
          {task.status && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded border ${
              task.status === "running" ? "text-[#cca700] border-[#cca700]/30"
              : task.status === "completed" || task.status === "done" ? "text-[#89d185] border-[#89d185]/30"
              : task.status === "failed" ? "text-[#f14c4c] border-[#f14c4c]/30"
              : "text-[#a0a0a0] border-[#a0a0a0]/30"
            }`}>
              {task.status}
            </span>
          )}
          <span className="ml-auto text-[10px] text-[#a0a0a0] font-mono">{runCount} 件</span>
        </div>
        {hasChildren && !isCollapsed && task.children.map((child) => renderTaskNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-64 overflow-auto p-2.5 border-r" style={{ background: "#1b1b1b", borderColor: "#3c3c3c" }}>
      <div
        className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-xs select-none ${selectedTaskId === null ? "bg-[rgba(14,99,156,0.22)]" : "hover:bg-white/[0.04]"}`}
        onClick={() => onTaskSelect(null)}
      >
        <span className="w-3.5 text-center text-white/50">◎</span>
        <span className="text-[#d4d4d4]">全タスク</span>
        <span className="ml-auto text-[10px] text-[#a0a0a0] font-mono">{totalRuns} 件</span>
      </div>
      {tasks.map((task) => renderTaskNode(task, 0))}
    </div>
  );
}

