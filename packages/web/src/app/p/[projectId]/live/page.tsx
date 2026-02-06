"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  tasksApi,
  agentProfilesApi,
  runsApi,
  orchestrateApi,
  type Task,
  type Run,
  type AgentProfile,
} from "@/lib/api";
import { useState, useMemo, useEffect } from "react";
import { useAppStore, type OutputLine } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_COLORS } from "@/components/design-tokens";
import { TerminalOutput } from "@/components/TerminalOutput";

// --- セッション型 ---

interface Session {
  parentTaskId: number;
  coordinatorRun: Run;
  taskTitle: string;
}

// --- SessionSidebar ---

function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  childTaskCounts,
}: {
  sessions: Session[];
  activeSessionId: number | null;
  onSelect: (parentTaskId: number) => void;
  childTaskCounts: Map<number, { running: number; completed: number; total: number }>;
}) {
  return (
    <div
      className="flex flex-col border-r overflow-hidden"
      style={{
        width: 220,
        minWidth: 220,
        background: "#1b1b1b",
        borderColor: "#3c3c3c",
      }}
    >
      <div
        className="px-3 py-2 border-b text-[11px] font-semibold"
        style={{ color: "#d4d4d4", borderColor: "#3c3c3c", background: "#252526" }}
      >
        セッション一覧
      </div>
      <div className="flex-1 overflow-auto">
        {sessions.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 text-xs"
            style={{ color: "#484f58" }}
          >
            セッションなし
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSessionId === session.parentTaskId;
            const counts = childTaskCounts.get(session.parentTaskId);
            return (
              <div
                key={session.parentTaskId}
                className="px-3 py-2.5 border-b cursor-pointer select-none"
                style={{
                  borderColor: "#2d2d2d",
                  background: isActive ? "rgba(14,99,156,0.22)" : "transparent",
                }}
                onClick={() => onSelect(session.parentTaskId)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: STATUS_COLORS[session.coordinatorRun.status] || "#71717a",
                      boxShadow:
                        session.coordinatorRun.status === "running"
                          ? `0 0 6px ${STATUS_COLORS.running}`
                          : "none",
                    }}
                  />
                  <StatusBadge status={session.coordinatorRun.status} />
                </div>
                <div
                  className="text-xs truncate mb-1"
                  style={{ color: "#c9d1d9" }}
                  title={session.taskTitle}
                >
                  {session.taskTitle}
                </div>
                <div className="flex gap-2 text-[10px] font-mono" style={{ color: "#8b949e" }}>
                  <span>T#{session.parentTaskId}</span>
                  <span>R#{session.coordinatorRun.id}</span>
                  {counts && counts.total > 0 && (
                    <span className="ml-auto">
                      {counts.completed}/{counts.total}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- HumanCommandBar (Layer 1) ---

function HumanCommandBar({
  profiles,
  onStart,
  onStopAll,
  isExecuting,
}: {
  profiles: AgentProfile[];
  onStart: (command: string, agentProfileId: number) => void;
  onStopAll: () => void;
  isExecuting: boolean;
}) {
  const [command, setCommand] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    profiles[0]?.id ?? null
  );
  const sseConnected = useAppStore((s) => s.sseConnected);

  useEffect(() => {
    if (profiles.length > 0 && selectedProfileId === null) {
      setSelectedProfileId(profiles[0]!.id);
    }
  }, [profiles, selectedProfileId]);

  const handleSubmit = () => {
    if (!command.trim() || !selectedProfileId) return;
    onStart(command.trim(), selectedProfileId);
    setCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="px-4 py-3 border-b flex items-start gap-3"
      style={{ background: "#252526", borderColor: "#3c3c3c" }}
    >
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded"
            style={{ background: "#0e639c33", color: "#58a6ff" }}
          >
            [1] Human
          </span>
          <span className="text-xs" style={{ color: "#8b949e" }}>
            指令入力
          </span>
          <div className="flex-1" />
          <span className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${sseConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
            />
            <span style={{ color: "#8b949e" }}>
              SSE: {sseConnected ? "接続中" : "切断"}
            </span>
          </span>
        </div>
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="指令を入力... (Ctrl+Enter で実行)"
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-md border outline-none resize-none"
          style={{
            background: "#1b1b1b",
            borderColor: "#3c3c3c",
            color: "#d4d4d4",
          }}
        />
      </div>
      <div className="flex flex-col gap-2 pt-6">
        <select
          value={selectedProfileId ?? ""}
          onChange={(e) => setSelectedProfileId(Number(e.target.value))}
          className="px-2 py-1.5 text-xs rounded border outline-none"
          style={{
            background: "#1b1b1b",
            borderColor: "#3c3c3c",
            color: "#d4d4d4",
          }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!command.trim() || !selectedProfileId}
            className="px-3 py-1.5 text-xs rounded cursor-pointer border disabled:opacity-40"
            style={{
              background: "#0e639c",
              borderColor: "rgba(255,255,255,0.12)",
              color: "#d4d4d4",
            }}
          >
            実行
          </button>
          <button
            onClick={onStopAll}
            disabled={!isExecuting}
            className="px-3 py-1.5 text-xs rounded cursor-pointer border disabled:opacity-40"
            style={{
              background: "#6e1a1a",
              borderColor: "rgba(255,255,255,0.12)",
              color: "#d4d4d4",
            }}
          >
            全停止
          </button>
        </div>
      </div>
    </div>
  );
}

// --- CoordinatorPane (Layer 2+3) ---

function CoordinatorPane({
  coordinatorRunId,
  coordinatorStatus,
}: {
  coordinatorRunId: number | null;
  coordinatorStatus: string | null;
}) {
  const runOutputs = useAppStore((s) => s.runOutputs);
  const lines = coordinatorRunId
    ? runOutputs.get(coordinatorRunId) ?? []
    : [];
  const isRunning = coordinatorStatus === "running";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex flex-col border rounded-lg overflow-hidden"
      style={{ background: "#0d1117", borderColor: "#30363d" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer select-none"
        style={{ background: "#161b22", borderColor: "#30363d" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{ background: "#d2a8ff22", color: "#d2a8ff" }}
        >
          [2+3]
        </span>
        <span className="text-xs font-semibold" style={{ color: "#c9d1d9" }}>
          Orchestrator / Planner
        </span>
        {coordinatorRunId && (
          <span
            className="text-[10px] font-mono"
            style={{ color: "#8b949e" }}
          >
            Run #{coordinatorRunId}
          </span>
        )}
        {coordinatorStatus && <StatusBadge status={coordinatorStatus} />}
        <div className="flex-1" />
        <span className="text-[10px]" style={{ color: "#8b949e" }}>
          {collapsed ? "展開" : "折りたたみ"}
        </span>
      </div>
      {!collapsed && (
        <div style={{ height: 280 }}>
          <TerminalOutput lines={lines} isRunning={isRunning} maxHeight={280} />
        </div>
      )}
    </div>
  );
}

// --- SupervisorPane (Layer 4) ---

function SupervisorPane({
  childTasks,
  allRuns,
}: {
  childTasks: Task[];
  allRuns: Run[];
}) {
  const runningCount = allRuns.filter(
    (r) => r.status === "running" && r.role !== "coordinator"
  ).length;
  const completedCount = allRuns.filter(
    (r) => r.status === "completed" && r.role !== "coordinator"
  ).length;
  const failedCount = allRuns.filter(
    (r) => r.status === "failed" && r.role !== "coordinator"
  ).length;

  const getTaskStatus = (task: Task): string => {
    const taskRuns = allRuns.filter((r) => r.taskId === task.id);
    if (taskRuns.some((r) => r.status === "running")) return "running";
    if (taskRuns.some((r) => r.status === "completed")) return "completed";
    if (taskRuns.some((r) => r.status === "failed")) return "failed";
    return "ready";
  };

  const getWorkerRunId = (task: Task): number | null => {
    const taskRuns = allRuns.filter(
      (r) => r.taskId === task.id && r.role !== "coordinator"
    );
    return taskRuns[0]?.id ?? null;
  };

  return (
    <div
      className="flex flex-col border rounded-lg overflow-hidden"
      style={{ background: "#0d1117", borderColor: "#30363d" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{ background: "#cca70022", color: "#cca700" }}
        >
          [4]
        </span>
        <span className="text-xs font-semibold" style={{ color: "#c9d1d9" }}>
          Supervisor
        </span>
        <span className="text-[10px]" style={{ color: "#8b949e" }}>
          タスクツリー + ステータス
        </span>
      </div>
      <div className="flex-1 overflow-auto p-3" style={{ maxHeight: 280 }}>
        {childTasks.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-xs"
            style={{ color: "#484f58", minHeight: 60 }}
          >
            サブタスク待ち...
          </div>
        ) : (
          <div className="space-y-1.5">
            {childTasks.map((task) => {
              const status = getTaskStatus(task);
              const workerRunId = getWorkerRunId(task);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <StatusBadge status={status} />
                  <span style={{ color: "#c9d1d9" }}>
                    Task#{task.id}: {task.title}
                  </span>
                  {workerRunId && (
                    <span
                      className="text-[10px] font-mono ml-auto"
                      style={{ color: "#8b949e" }}
                    >
                      [Worker#{workerRunId}]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div
          className="flex gap-4 mt-3 pt-3 border-t text-[11px]"
          style={{ borderColor: "#30363d" }}
        >
          <span style={{ color: "#cca700" }}>実行中: {runningCount}</span>
          <span style={{ color: "#89d185" }}>完了: {completedCount}</span>
          <span style={{ color: "#f14c4c" }}>失敗: {failedCount}</span>
        </div>
      </div>
    </div>
  );
}

// --- WorkerGrid (Layer 5) ---

function WorkerGrid({ workerRuns }: { workerRuns: Run[] }) {
  const runOutputs = useAppStore((s) => s.runOutputs);

  const displayRuns = workerRuns.slice(0, 8);
  const gridCols = displayRuns.length <= 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div
      className="flex flex-col border rounded-lg overflow-hidden"
      style={{ background: "#0d1117", borderColor: "#30363d" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{ background: "#7ee78722", color: "#7ee787" }}
        >
          [5]
        </span>
        <span className="text-xs font-semibold" style={{ color: "#c9d1d9" }}>
          Workers
        </span>
        {workerRuns.filter((r) => r.status === "running").length > 0 && (
          <span
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: "#cca700" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            {workerRuns.filter((r) => r.status === "running").length} 件実行中
          </span>
        )}
      </div>
      <div className={`grid ${gridCols} gap-2 p-2`}>
        {displayRuns.length === 0 ? (
          <div
            className="col-span-2 flex items-center justify-center text-xs py-8"
            style={{ color: "#484f58" }}
          >
            Worker待ち...
          </div>
        ) : (
          displayRuns.map((run) => (
            <WorkerPane
              key={run.id}
              run={run}
              lines={runOutputs.get(run.id) ?? []}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WorkerPane({ run, lines }: { run: Run; lines: OutputLine[] }) {
  const isRunning = run.status === "running";
  const statusColor = isRunning
    ? "#cca700"
    : run.status === "completed"
      ? "#89d185"
      : run.status === "failed"
        ? "#f14c4c"
        : "#a0a0a0";

  return (
    <div
      className="rounded border overflow-hidden flex flex-col"
      style={{
        background: "#0d1117",
        borderColor: "#30363d",
        height: 200,
      }}
    >
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 border-b"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: statusColor,
            boxShadow: isRunning ? `0 0 6px ${statusColor}` : "none",
          }}
        />
        <span
          className="text-[11px] font-semibold"
          style={{ color: "#c9d1d9" }}
        >
          Worker #{run.id}
        </span>
        <span
          className="text-[10px] font-mono ml-auto"
          style={{ color: "#8b949e" }}
        >
          Task#{run.taskId}
        </span>
      </div>
      <TerminalOutput lines={lines} isRunning={isRunning} maxHeight={170} />
    </div>
  );
}

// --- ReviewerPane ---

function ReviewerPane({
  completedWorkerRuns,
}: {
  completedWorkerRuns: Run[];
}) {
  return (
    <div
      className="flex flex-col border rounded-lg overflow-hidden"
      style={{ background: "#0d1117", borderColor: "#30363d" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{ background: "#58a6ff22", color: "#58a6ff" }}
        >
          [+]
        </span>
        <span className="text-xs font-semibold" style={{ color: "#c9d1d9" }}>
          Reviewer
        </span>
      </div>
      <div className="flex-1 overflow-auto p-3" style={{ maxHeight: 200 }}>
        {completedWorkerRuns.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-xs"
            style={{ color: "#484f58", minHeight: 60 }}
          >
            検証待ち...
          </div>
        ) : (
          <div className="space-y-2">
            {completedWorkerRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span style={{ color: "#c9d1d9" }}>
                  Worker#{run.id} (Task#{run.taskId})
                </span>
                <span className="ml-auto flex gap-3 text-[10px] font-mono">
                  <span style={{ color: "#8b949e" }}>
                    lint:{" "}
                    <span
                      style={{
                        color:
                          run.dodStatus === "passed" ? "#89d185" : "#8b949e",
                      }}
                    >
                      {run.dodStatus === "passed" ? "pass" : "---"}
                    </span>
                  </span>
                  <span style={{ color: "#8b949e" }}>
                    test:{" "}
                    <span
                      style={{
                        color:
                          run.dodStatus === "passed" ? "#89d185" : "#8b949e",
                      }}
                    >
                      {run.dodStatus === "passed" ? "pass" : "---"}
                    </span>
                  </span>
                  <span style={{ color: "#8b949e" }}>
                    scope:{" "}
                    <span
                      style={{
                        color:
                          (run.scopeViolationCount ?? 0) === 0
                            ? "#89d185"
                            : "#f14c4c",
                      }}
                    >
                      {(run.scopeViolationCount ?? 0) === 0
                        ? "ok"
                        : "violation"}
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- メインページ ---

export default function LivePage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();

  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId);

  // AgentProfile一覧
  const { data: profiles } = useQuery({
    queryKey: ["agentProfiles", projectId],
    queryFn: async () => {
      const res = await agentProfilesApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  // Coordinator Run一覧（セッション一覧のソース）
  const { data: coordinatorRuns } = useQuery({
    queryKey: ["coordinatorRuns", projectId],
    queryFn: async () => {
      const res = await runsApi.listAll({ role: "coordinator" });
      if ("error" in res) return [];
      return res.data;
    },
    refetchInterval: 3000,
  });

  // タスク一覧
  const { data: tasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await tasksApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
    refetchInterval: activeSessionId ? 3000 : false,
  });

  // 全Run一覧
  const { data: allRuns } = useQuery({
    queryKey: ["allRuns", projectId],
    queryFn: async () => {
      const res = await runsApi.listAll();
      if ("error" in res) return [];
      return res.data;
    },
    refetchInterval: activeSessionId ? 3000 : false,
  });

  // セッション一覧を導出
  const sessions: Session[] = useMemo(() => {
    if (!coordinatorRuns || !tasks) return [];
    // このプロジェクトのタスクIDセット
    const projectTaskIds = new Set(tasks.map((t) => t.id));
    return coordinatorRuns
      .filter((run) => projectTaskIds.has(run.taskId))
      .map((run) => {
        const task = tasks.find((t) => t.id === run.taskId);
        return {
          parentTaskId: run.taskId,
          coordinatorRun: run,
          taskTitle: task?.title ?? `Task#${run.taskId}`,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.coordinatorRun.startedAt).getTime() -
          new Date(a.coordinatorRun.startedAt).getTime()
      );
  }, [coordinatorRuns, tasks]);

  // 子タスク進捗カウント（サイドバー用）
  const childTaskCounts = useMemo(() => {
    const map = new Map<number, { running: number; completed: number; total: number }>();
    if (!tasks || !allRuns) return map;
    for (const session of sessions) {
      const children = tasks.filter((t) => t.parentId === session.parentTaskId);
      let running = 0;
      let completed = 0;
      for (const child of children) {
        const childRuns = allRuns.filter(
          (r) => r.taskId === child.id && r.role !== "coordinator"
        );
        if (childRuns.some((r) => r.status === "running")) running++;
        else if (childRuns.some((r) => r.status === "completed")) completed++;
      }
      map.set(session.parentTaskId, {
        running,
        completed,
        total: children.length,
      });
    }
    return map;
  }, [sessions, tasks, allRuns]);

  // 選択中セッションの子タスク
  const childTasks = useMemo(() => {
    if (!tasks || !activeSessionId) return [];
    return tasks.filter((t) => t.parentId === activeSessionId);
  }, [tasks, activeSessionId]);

  // 選択中セッションのCoordinator Run
  const activeSession = useMemo(
    () => sessions.find((s) => s.parentTaskId === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  // 選択中セッションのWorker Runs
  const workerRuns = useMemo(() => {
    if (!allRuns || !activeSessionId) return [];
    const childTaskIds = new Set(childTasks.map((t) => t.id));
    return allRuns.filter(
      (r) => childTaskIds.has(r.taskId) && r.role !== "coordinator"
    );
  }, [allRuns, activeSessionId, childTasks]);

  // セッション配下の全Run（全停止用）
  const sessionRuns = useMemo(() => {
    if (!allRuns || !activeSessionId) return [];
    const relatedTaskIds = new Set([activeSessionId, ...childTasks.map((t) => t.id)]);
    return allRuns.filter((r) => relatedTaskIds.has(r.taskId));
  }, [allRuns, activeSessionId, childTasks]);

  const completedWorkerRuns = useMemo(
    () =>
      workerRuns.filter(
        (r) => r.status === "completed" || r.status === "failed"
      ),
    [workerRuns]
  );

  const isExecuting =
    !!activeSession && activeSession.coordinatorRun.status === "running";

  // Orchestrate起動
  const orchestrateMutation = useMutation({
    mutationFn: (data: { command: string; agentProfileId: number }) =>
      orchestrateApi.start(projectId, data),
    onSuccess: (res) => {
      if ("data" in res) {
        setActiveSessionId(res.data.parentTaskId);
        queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        queryClient.invalidateQueries({ queryKey: ["allRuns", projectId] });
        queryClient.invalidateQueries({ queryKey: ["coordinatorRuns", projectId] });
      }
    },
  });

  const handleStart = (command: string, agentProfileId: number) => {
    orchestrateMutation.mutate({ command, agentProfileId });
  };

  // 選択中セッションの全停止
  const handleStopAll = async () => {
    const runningRuns = sessionRuns.filter((r) => r.status === "running");
    await Promise.all(runningRuns.map((r) => runsApi.stop(r.id)));
    queryClient.invalidateQueries({ queryKey: ["allRuns", projectId] });
    queryClient.invalidateQueries({ queryKey: ["coordinatorRuns", projectId] });
  };

  return (
    <div
      className="h-full flex"
      style={{
        background: "#1e1e1e",
        color: "#d4d4d4",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* セッションサイドバー */}
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        childTaskCounts={childTaskCounts}
      />

      {/* 5層ビュー */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* [1] Human */}
        <HumanCommandBar
          profiles={profiles ?? []}
          onStart={handleStart}
          onStopAll={handleStopAll}
          isExecuting={isExecuting}
        />

        {/* メインコンテンツ */}
        {!activeSessionId ? (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: "#484f58" }}
          >
            <div className="text-center">
              <div className="text-sm mb-2">セッションを選択、または新規指令を実行してください</div>
              <div className="text-xs">左のサイドバーからセッションを選択できます</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
            {/* 中段: Coordinator + Supervisor */}
            <div className="grid grid-cols-2 gap-3" style={{ minHeight: 300 }}>
              <CoordinatorPane
                coordinatorRunId={activeSession?.coordinatorRun.id ?? null}
                coordinatorStatus={activeSession?.coordinatorRun.status ?? null}
              />
              <SupervisorPane childTasks={childTasks} allRuns={allRuns ?? []} />
            </div>

            {/* 下段: Workers + Reviewer */}
            <div className="grid grid-cols-2 gap-3" style={{ minHeight: 220 }}>
              <WorkerGrid workerRuns={workerRuns} />
              <ReviewerPane completedWorkerRuns={completedWorkerRuns} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
