"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { tasksApi, agentProfilesApi, runsApi, monitorApi, type Task, type Run, type MonitorTask } from "@/lib/api";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useAppStore, type OutputLine } from "@/lib/store";
import { FilterBar } from "./components/FilterBar";
import { LiveTerminalGrid } from "./components/LiveTerminalGrid";
import { TerminalOutput } from "./components/TerminalOutput";
import { Badge } from "./components/Badge";
import { OverviewChart } from "./components/OverviewChart";
import { TaskTree } from "./components/TaskTree";
import { TaskDrawer } from "./components/TaskDrawer";
import { DetailsPanel } from "./components/DetailsPanel";
import { RunsTable } from "./components/RunsTable";
import { formatDuration, formatTime, STATUS_COLORS } from "./utils";

export type ExtendedRun = Run & { taskTitle: string; taskId: number; agentProfileName?: string };

export default function MonitorPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detailsHidden, setDetailsHidden] = useState(true);
  const [activeTab, setActiveTab] = useState<"output" | "meta" | "timing" | "checks" | "violations" | "git">("output");
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<number>>(new Set());
  const [taskForm, setTaskForm] = useState({ title: "", description: "", writeScope: "src/**" });
  const terminalRef = useRef<HTMLDivElement>(null);
  const runOutputs = useAppStore((s) => s.runOutputs);
  const selectedOutputs = selectedRunId ? (runOutputs.get(selectedRunId) ?? []) : [];

  // フィルタ状態
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [reasonCodeFilters, setReasonCodeFilters] = useState<Set<string>>(new Set());
  const [taskFilter, setTaskFilter] = useState("");
  const [agentProfileFilters, setAgentProfileFilters] = useState<Set<string>>(new Set());

  // 自動スクロール
  useEffect(() => {
    if (terminalRef.current && activeTab === "output") {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [selectedOutputs.length, activeTab]);

  const { data: profiles } = useQuery({
    queryKey: ["agentProfiles", projectId],
    queryFn: async () => {
      const res = await agentProfilesApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  // モニターAPI呼び出し（フィルタパラメータ付き）
  const monitorParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (statusFilters.size > 0) {
      params.status = Array.from(statusFilters).join(",");
    }
    if (reasonCodeFilters.size > 0) {
      params.reason_codes = Array.from(reasonCodeFilters).join(",");
    }
    if (taskFilter) {
      params.task = taskFilter;
    }
    if (agentProfileFilters.size > 0) {
      const firstProfile = Array.from(agentProfileFilters)[0];
      if (firstProfile) {
        params.agent_profile = firstProfile; // 単一選択として扱う
      }
    }
    return params;
  }, [statusFilters, reasonCodeFilters, taskFilter, agentProfileFilters]);

  const { data: monitorData, isLoading: monitorLoading } = useQuery({
    queryKey: ["monitor", projectId, monitorParams],
    queryFn: async () => {
      const params = Object.keys(monitorParams).length > 0 ? monitorParams : undefined;
      const res = await monitorApi.get(projectId, params);
      if ("error" in res) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
    refetchInterval: 3000, // 3秒ごとに更新
  });

<<<<<<< HEAD
  // 全runsをフラット化（タスク階層から抽出）
  const allRuns = useMemo((): ExtendedRun[] => {
    if (!monitorData) return [];
    const runs: ExtendedRun[] = [];
    const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) ?? []);
=======
  // フィルタリング
  const filteredRuns = useMemo(() => {
    if (!allRuns) return [];
    return allRuns.filter((run) => {
      // タスク選択フィルタ
      if (selectedTaskId !== null) {
        if (!includeDescendants && run.taskId !== selectedTaskId) return false;
        if (includeDescendants) {
          const task = tasks?.find((t) => t.id === run.taskId);
          if (task && task.id !== selectedTaskId && task.parentId !== selectedTaskId) return false;
        }
      }
      // 検索フィルタ
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !run.taskTitle.toLowerCase().includes(q) &&
          !String(run.id).includes(q) &&
          !run.status.includes(q) &&
          !run.agentProfileName?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allRuns, selectedTaskId, includeDescendants, searchQuery, tasks]);
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad

    const extractRuns = (task: MonitorTask) => {
      task.runs.forEach((run) => {
        runs.push({
          ...run,
          taskTitle: task.title,
          taskId: task.id,
          agentProfileName: profileMap.get(run.agentProfileId) ?? "-",
        });
      });
      task.children.forEach(extractRuns);
    };

    monitorData.tasks.forEach(extractRuns);
    return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [monitorData, profiles]);


  // タイムライン計算（overviewから取得）
  const timelineData = useMemo(() => {
    if (!monitorData?.overview) return null;
    const { time_range } = monitorData.overview;
    const minTime = new Date(time_range.start).getTime();
    const maxTime = new Date(time_range.end).getTime();
    return { minTime, maxTime, range: Math.max(maxTime - minTime, 1) };
  }, [monitorData]);

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description: string; writeScope: string[] }) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["monitor", projectId] });
      setShowDrawer(false);
      setTaskForm({ title: "", description: "", writeScope: "src/**" });
    },
  });

  const startRunMutation = useMutation({
    mutationFn: ({ taskId, agentProfileId }: { taskId: number; agentProfileId: number }) =>
      runsApi.create(taskId, agentProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["monitor", projectId] });
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      title: taskForm.title,
      description: taskForm.description,
      writeScope: taskForm.writeScope.split(",").map((s) => s.trim()),
    });
  };

  const _handleStartRun = (task: Task) => {
    const firstProfile = profiles?.[0];
    if (!firstProfile) {
      alert("先にエージェントプロファイルを作成してください");
      return;
    }
    startRunMutation.mutate({ taskId: task.id, agentProfileId: firstProfile.id });
  };

  const selectRun = (run: ExtendedRun) => {
    setSelectedRunId(run.id);
    setDetailsHidden(false);
  };

  const selectedRun = allRuns?.find((r) => r.id === selectedRunId);

  const toggleTaskCollapse = (taskId: number) => {
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // タスクツリー（monitorDataから取得、既に階層構造）
  const taskTree = useMemo(() => {
    if (!monitorData) return { rootTasks: [] };
    return { rootTasks: monitorData.tasks };
  }, [monitorData]);

<<<<<<< HEAD
  const countRunsForTask = useCallback((task: MonitorTask): number => {
    return task.runs.length + task.children.reduce((sum, child) => sum + countRunsForTask(child), 0);
  }, []);
=======
  const countRunsForTask = useCallback(
    (taskId: number): number => {
      const taskRuns = allRuns?.filter((r) => r.taskId === taskId).length ?? 0;
      const children = taskTree.childMap?.get(taskId) ?? [];
      return taskRuns + children.reduce((sum, child) => sum + countRunsForTask(child.id), 0);
    },
    [allRuns, taskTree.childMap]
  );
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad

  // Overview SVG
  const overviewSvg = useMemo(() => {
    if (!allRuns || allRuns.length === 0 || !timelineData) return null;
    const width = 1000;
    const height = 64;
    const laneH = 6;
    const gap = 2;
    const topPad = 4;
    const maxLanes = Math.floor((height - topPad * 2 + gap) / (laneH + gap));

<<<<<<< HEAD
    const sorted = [...allRuns].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
=======
    const sorted = [...filteredRuns].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
    const laneEnd: number[] = [];
    const placed: { lane: number; run: ExtendedRun }[] = [];

    for (const run of sorted) {
      const startTime = new Date(run.startedAt).getTime();
      const endTime = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();

      let lane = laneEnd.findIndex((end) => end <= startTime);
      if (lane === -1) {
        if (laneEnd.length < maxLanes) {
          lane = laneEnd.length;
          laneEnd.push(0);
        } else {
          lane = laneEnd.reduce(
            (best, val, idx) => (val < (laneEnd[best] ?? Infinity) ? idx : best),
            0
          );
        }
      }
      laneEnd[lane] = endTime;
      placed.push({ lane, run });
    }

    const pct = (time: number) => ((time - timelineData.minTime) / timelineData.range) * 100;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => {
      const x = width * p;
      return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
    });

    const bars = placed.map(({ lane, run }) => {
      const left = pct(new Date(run.startedAt).getTime());
      const right = pct(run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now());
      const x = (width * left) / 100;
      const w = Math.max(2, (width * (right - left)) / 100);
      const y = topPad + lane * (laneH + gap);
      const fill = TIMELINE_STATUS_COLORS[run.status] || TIMELINE_STATUS_COLORS.pending;
      return `<rect data-run-id="${run.id}" x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${laneH}" fill="${fill}" rx="2" style="cursor:pointer"><title>実行 #${run.id} (${run.status})</title></rect>`;
    });

<<<<<<< HEAD
    return { svg: [...gridLines, ...bars].join(""), ticks: [0, 0.25, 0.5, 0.75, 1].map((p) => formatTime(new Date(timelineData.minTime + timelineData.range * p).toISOString())) };
  }, [allRuns, timelineData]);

  if (monitorLoading) {
=======
    return {
      svg: [...gridLines, ...bars].join(""),
      ticks: [0, 0.25, 0.5, 0.75, 1].map((p) =>
        formatTime(new Date(timelineData.minTime + timelineData.range * p).toISOString())
      ),
    };
  }, [filteredRuns, timelineData]);

  // orchestrator running判定（task単位）
  const isOrchestratorRunning = useCallback(
    (taskId: number): boolean => {
      return (
        allRuns?.some(
          (r) => r.taskId === taskId && r.role === "coordinator" && r.status === "running"
        ) ?? false
      );
    },
    [allRuns]
  );

  if (tasksLoading) {
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#1e1e1e" }}>
        <div className="flex items-center gap-3" style={{ color: "#a0a0a0" }}>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span style={{ fontSize: 12 }}>読み込み中...</span>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
=======
  const tabs = [
    { id: "output" as const, label: "出力" },
    { id: "meta" as const, label: "メタ" },
    { id: "timing" as const, label: "タイミング" },
    { id: "checks" as const, label: "チェック" },
    { id: "violations" as const, label: "違反" },
    { id: "git" as const, label: "Git/Worktree" },
  ];

  const renderTaskNode = (task: Task, depth: number) => {
    const children = taskTree.childMap?.get(task.id) ?? [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedTasks.has(task.id);
    const isSelected = selectedTaskId === task.id;
    const runCount = countRunsForTask(task.id);
    const autoRunning = isOrchestratorRunning(task.id);

    return (
      <div key={task.id}>
        <div
          className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-xs select-none ${isSelected ? "bg-[rgba(14,99,156,0.22)]" : "hover:bg-white/[0.04]"}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => setSelectedTaskId(task.id)}
        >
          <span
            className="w-3.5 text-center text-white/50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleTaskCollapse(task.id);
            }}
          >
            {hasChildren ? (isCollapsed ? "▸" : "▾") : "•"}
          </span>
          <span className="text-[#d4d4d4] truncate">
            タスク #{task.id}: {task.title}
          </span>
          {autoRunning && (
            <span
              className="shrink-0 px-1.5 py-0.5 text-[9px] font-semibold rounded"
              style={{ background: "rgba(204,167,0,0.2)", color: "#cca700" }}
            >
              Auto
            </span>
          )}
          <span className="shrink-0 text-[10px] text-[#a0a0a0] font-mono">{runCount} 件</span>
          <button
            className="shrink-0 ml-auto px-1.5 py-0.5 text-[10px] rounded border cursor-pointer hover:bg-white/10"
            style={{ borderColor: "#3c3c3c", color: "#4fc1ff" }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/p/${projectId}/live?taskId=${task.id}`);
            }}
          >
            Live
          </button>
        </div>
        {hasChildren && !isCollapsed && children.map((child) => renderTaskNode(child, depth + 1))}
      </div>
    );
  };
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: "#1e1e1e",
        color: "#d4d4d4",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Section Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-3 flex-wrap"
        style={{ background: "#252526", borderColor: "#3c3c3c" }}
      >
        <h2 className="text-[13px] font-semibold m-0">モニター（タスクツリー + テーブル）</h2>
<<<<<<< HEAD
        {monitorData && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#a0a0a0]">総タスク: <strong className="text-[#d4d4d4]">{monitorData.summary.total_tasks}</strong></span>
            <span className="text-[#a0a0a0]">実行中: <strong className="text-[#cca700]">{monitorData.summary.running_runs}</strong></span>
            <span className="text-[#a0a0a0]">レビュー待ち: <strong className="text-[#cca700]">{monitorData.summary.needs_review_tasks}</strong></span>
            <span className="text-[#a0a0a0]">失敗: <strong className="text-[#f14c4c]">{monitorData.summary.failed_tasks}</strong></span>
          </div>
        )}
        <div className="flex-1" />
=======
        <input
          type="text"
          placeholder="検索: task / run / agent_profile"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-2.5 py-1.5 text-[13px] rounded-md border outline-none"
          style={{ background: "#1b1b1b", borderColor: "#3c3c3c", color: "#d4d4d4" }}
        />
        <label className="flex items-center gap-2 text-xs text-[#a0a0a0]">
          <input
            type="checkbox"
            checked={includeDescendants}
            onChange={(e) => setIncludeDescendants(e.target.checked)}
            style={{ accentColor: "#0e639c" }}
          />
          子孫を含む
        </label>
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
        <button
          onClick={() => setShowDrawer(true)}
          className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border"
          style={{ background: "#0e639c", borderColor: "rgba(255,255,255,0.12)", color: "#d4d4d4" }}
        >
          + タスク
        </button>
      </div>

      {/* Filter Bar */}
      {profiles && (
        <FilterBar
          statusFilters={statusFilters}
          setStatusFilters={setStatusFilters}
          reasonCodeFilters={reasonCodeFilters}
          setReasonCodeFilters={setReasonCodeFilters}
          taskFilter={taskFilter}
          setTaskFilter={setTaskFilter}
          agentProfileFilters={agentProfileFilters}
          setAgentProfileFilters={setAgentProfileFilters}
          profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}

      {/* Selection Pill */}
      <div
        className="px-3 py-1.5 flex items-center gap-2 border-b"
        style={{ background: "#252526", borderColor: "#3c3c3c" }}
      >
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full border"
          style={{ background: "#2d2d2d", borderColor: "#3c3c3c" }}
        >
          <span className="text-[#a0a0a0]">選択</span>
          <strong className="text-[#d4d4d4] font-semibold">
            {selectedTaskId === null ? "全タスク" : `タスク #${selectedTaskId}`}
          </strong>
        </span>
        {selectedTaskId !== null && (
          <button
            onClick={() => setSelectedTaskId(null)}
            className="text-[11px] text-[#4fc1ff] hover:underline"
          >
            クリア
          </button>
        )}
      </div>

      {/* Overview */}
<<<<<<< HEAD
      {monitorData?.overview && <OverviewChart overview={monitorData.overview} />}
=======
      {overviewSvg && (
        <div
          className="mx-3 mt-2 rounded-lg overflow-hidden border"
          style={{ background: "#111", borderColor: "#3c3c3c" }}
        >
          <div
            className="flex items-center justify-between px-2.5 py-1.5 text-[11px] border-b"
            style={{ color: "#a0a0a0", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span>概要（アクティビティ）</span>
            <span className="font-mono">
              {overviewSvg.ticks[0]} - {overviewSvg.ticks[4]}
            </span>
          </div>
          <svg
            viewBox="0 0 1000 64"
            preserveAspectRatio="none"
            className="w-full h-16 block"
            dangerouslySetInnerHTML={{ __html: overviewSvg.svg }}
            onClick={(e) => {
              const target = e.target as SVGElement;
              const runId = target.getAttribute?.("data-run-id");
              if (runId) {
                const run = allRuns?.find((r) => r.id === Number(runId));
                if (run) selectRun(run);
              }
            }}
          />
          <div
            className="flex justify-between px-2.5 py-1 text-[10px]"
            style={{ color: "#a0a0a0" }}
          >
            {overviewSvg.ticks.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      )}
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad

      {/* Live Terminal Grid (Shogun-style multi-pane) */}
      <LiveTerminalGrid runs={allRuns ?? []} runOutputs={runOutputs} />

      {/* Split: Tree + Table */}
      <div
        className={`flex-1 flex overflow-hidden ${detailsHidden ? "" : ""}`}
        style={{ minHeight: 0 }}
      >
        {/* Left */}
        <div
          className="flex-1 flex"
          style={{ borderRight: detailsHidden ? "none" : "1px solid #3c3c3c", minWidth: 0 }}
        >
          {/* Task Tree */}
<<<<<<< HEAD
          <TaskTree
            tasks={taskTree.rootTasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={setSelectedTaskId}
            collapsedTasks={collapsedTasks}
            onToggleCollapse={toggleTaskCollapse}
            countRunsForTask={countRunsForTask}
            totalRuns={allRuns?.length ?? 0}
          />

          {/* Table */}
          <RunsTable
            runs={allRuns}
            selectedRunId={selectedRunId}
            onRunSelect={selectRun}
            timelineData={timelineData}
          />
=======
          <div
            className="w-64 overflow-auto p-2.5 border-r"
            style={{ background: "#1b1b1b", borderColor: "#3c3c3c" }}
          >
            <div
              className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-xs select-none ${selectedTaskId === null ? "bg-[rgba(14,99,156,0.22)]" : "hover:bg-white/[0.04]"}`}
              onClick={() => setSelectedTaskId(null)}
            >
              <span className="w-3.5 text-center text-white/50">◎</span>
              <span className="text-[#d4d4d4]">全タスク</span>
              <span className="ml-auto text-[10px] text-[#a0a0a0] font-mono">
                {allRuns?.length ?? 0} 件
              </span>
            </div>
            {taskTree.rootTasks?.map((task) => renderTaskNode(task, 0))}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto" style={{ background: "#1b1b1b" }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#202020" }}>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 90,
                    }}
                  >
                    ステータス
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      minWidth: 200,
                    }}
                  >
                    タスク / 実行
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 100,
                    }}
                  >
                    エージェント
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 70,
                    }}
                  >
                    開始
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 70,
                    }}
                  >
                    所要時間
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 70,
                    }}
                  >
                    完了定義
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 60,
                    }}
                  >
                    違反
                  </th>
                  <th
                    className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b"
                    style={{
                      color: "#a0a0a0",
                      borderColor: "#3c3c3c",
                      background: "#202020",
                      width: 200,
                    }}
                  >
                    <div>タイムライン</div>
                    {timelineData && (
                      <div
                        className="flex justify-between text-[10px] font-normal mt-1"
                        style={{ color: "#666" }}
                      >
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                          <span key={i}>
                            {formatTime(
                              new Date(timelineData.minTime + timelineData.range * p).toISOString()
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2.5 py-4 text-center"
                      style={{ color: "#a0a0a0" }}
                    >
                      （選択中の実行なし）
                    </td>
                  </tr>
                ) : (
                  filteredRuns.map((run) => {
                    const isSelected = selectedRunId === run.id;
                    const left = timelineData
                      ? ((new Date(run.startedAt).getTime() - timelineData.minTime) /
                          timelineData.range) *
                        100
                      : 0;
                    const width = timelineData
                      ? Math.max(
                          1,
                          (((run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now()) -
                            new Date(run.startedAt).getTime()) /
                            timelineData.range) *
                            100
                        )
                      : 0;
                    return (
                      <tr
                        key={run.id}
                        className={`cursor-pointer ${isSelected ? "" : "hover:bg-white/[0.04]"}`}
                        style={{ background: isSelected ? "rgba(14,99,156,0.22)" : undefined }}
                        onClick={() => selectRun(run)}
                      >
                        <td
                          className="px-2.5 py-1.5 border-b"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          <StatusBadge status={run.status} />
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          <span className="text-[#d4d4d4]">
                            タスク #{run.taskId}: {run.taskTitle}
                          </span>
                          <span className="text-[#a0a0a0] ml-1">/ 実行 #{run.id}</span>
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full border border-white/10 bg-white/5 font-mono">
                            {run.agentProfileName}
                          </span>
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b"
                          style={{ borderColor: "rgba(255,255,255,0.06)", color: "#a0a0a0" }}
                        >
                          {formatTime(run.startedAt)}
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b font-mono"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          {formatDuration(run.startedAt, run.finishedAt)}
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          <StatusBadge status={run.dodStatus || "pending"} />
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b font-mono text-center"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          {run.scopeViolationCount || 0}
                        </td>
                        <td
                          className="px-2.5 py-1.5 border-b"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="relative h-3.5 rounded"
                            style={{
                              background:
                                "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), rgba(255,255,255,0.04)",
                              backgroundSize: "25% 100%",
                            }}
                          >
                            <div
                              className="absolute top-0.5 h-2.5 rounded"
                              style={{
                                background:
                                  TIMELINE_STATUS_COLORS[run.status] ||
                                  TIMELINE_STATUS_COLORS.pending,
                                border: "1px solid rgba(255,255,255,0.18)",
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
        </div>

        {/* Right: Details Panel */}
        {!detailsHidden && selectedRun && (
<<<<<<< HEAD
          <DetailsPanel
            run={selectedRun}
            lines={selectedOutputs}
            isRunning={selectedRun.status === "running"}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={() => setDetailsHidden(true)}
            terminalRef={terminalRef}
          />
        )}
      </div>

      <TaskDrawer
        show={showDrawer}
        onClose={() => setShowDrawer(false)}
        taskForm={taskForm}
        onFormChange={setTaskForm}
        onSubmit={handleCreateTask}
        isSubmitting={createTaskMutation.isPending}
      />
=======
          <div className="flex flex-col" style={{ width: 520, minWidth: 420 }}>
            {/* Details Header */}
            <div
              className="px-3 py-2 border-b flex items-center gap-2"
              style={{ background: "#252526", borderColor: "#3c3c3c" }}
            >
              <h2 className="text-[13px] font-semibold m-0">詳細</h2>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border"
                style={{ background: "#2d2d2d", borderColor: "#3c3c3c" }}
              >
                <span className="text-[#a0a0a0]">選択中</span>
                <strong className="text-[#d4d4d4] font-semibold">実行 #{selectedRun.id}</strong>
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border font-mono"
                style={{ background: "#2d2d2d", borderColor: "#3c3c3c" }}
              >
                <span className="text-[#a0a0a0]">head_sha</span>
                <strong className="text-[#d4d4d4]">
                  {selectedRun.headSha?.slice(0, 7) || "-"}
                </strong>
              </span>
              <div className="flex-1" />
              <button
                onClick={() => setDetailsHidden(true)}
                className="px-2 py-1 text-xs rounded border cursor-pointer"
                style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
              >
                隠す
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-2 px-2.5 py-2 border-b"
              style={{ background: "#252526", borderColor: "#3c3c3c" }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 text-xs rounded cursor-pointer ${activeTab === tab.id ? "bg-white/5 text-[#d4d4d4]" : "text-[#a0a0a0]"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-auto p-2.5" style={{ background: "#1b1b1b" }}>
              {activeTab === "output" && (
                <TerminalOutput
                  lines={selectedOutputs}
                  isRunning={selectedRun?.status === "running"}
                  terminalRef={terminalRef}
                />
              )}
              {activeTab === "meta" && (
                <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
                  <div className="text-[#a0a0a0]">タスクID</div>
                  <div className="font-mono">{selectedRun.taskId}</div>
                  <div className="text-[#a0a0a0]">実行ID</div>
                  <div className="font-mono">{selectedRun.id}</div>
                  <div className="text-[#a0a0a0]">プロファイル</div>
                  <div>{selectedRun.agentProfileName}</div>
                  <div className="text-[#a0a0a0]">ステータス</div>
                  <div>
                    <StatusBadge status={selectedRun.status} />
                  </div>
                </div>
              )}
              {activeTab === "timing" && (
                <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
                  <div className="text-[#a0a0a0]">スコープ適用</div>
                  <div className="font-mono">120ms</div>
                  <div className="text-[#a0a0a0]">ランナー実行</div>
                  <div className="font-mono">
                    {formatDuration(selectedRun.startedAt, selectedRun.finishedAt)}
                  </div>
                  <div className="text-[#a0a0a0]">後処理チェック</div>
                  <div className="font-mono">1.2s</div>
                  <div className="text-[#a0a0a0]">完了定義チェック</div>
                  <div className="font-mono">3.8s</div>
                </div>
              )}
              {activeTab === "checks" && (
                <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
                  <div className="text-[#a0a0a0]">完了定義</div>
                  <div>
                    <StatusBadge status={selectedRun.dodStatus || "pending"} />
                  </div>
                  <div className="text-[#a0a0a0]">チェック項目</div>
                  <div className="font-mono">lint: pending / test: pending</div>
                </div>
              )}
              {activeTab === "violations" && (
                <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
                  <div className="text-[#a0a0a0]">件数</div>
                  <div className="font-mono">{selectedRun.scopeViolationCount || 0}</div>
                  <div className="text-[#a0a0a0]">操作</div>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 text-xs rounded border cursor-pointer"
                      style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
                    >
                      承認
                    </button>
                    <button
                      className="px-2 py-1 text-xs rounded border cursor-pointer"
                      style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
                    >
                      却下
                    </button>
                  </div>
                </div>
              )}
              {activeTab === "git" && (
                <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
                  <div className="text-[#a0a0a0]">ヘッドSHA</div>
                  <div className="font-mono">{selectedRun.headSha || "-"}</div>
                  <div className="text-[#a0a0a0]">未コミット変更</div>
                  <div className="font-mono">
                    {selectedRun.worktreeDirty === null
                      ? "不明"
                      : selectedRun.worktreeDirty
                        ? "あり"
                        : "なし"}
                  </div>
                  <div className="text-[#a0a0a0]">ブランチ</div>
                  <div className="font-mono">{selectedRun.branchName}</div>
                  <div className="text-[#a0a0a0]">ワークツリーパス</div>
                  <div className="font-mono break-all">{selectedRun.worktreePath}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Backdrop */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/55 z-40" onClick={() => setShowDrawer(false)} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-[500px] max-w-[92vw] border-l z-50 flex flex-col transition-transform duration-150 ${showDrawer ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "#252526", borderColor: "#3c3c3c" }}
      >
        <div
          className="h-11 px-3 flex items-center gap-2.5 border-b"
          style={{ borderColor: "#3c3c3c" }}
        >
          <div className="text-[13px] font-semibold">タスク作成</div>
          <div className="flex-1" />
          <button
            onClick={() => setShowDrawer(false)}
            className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border"
            style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
          >
            閉じる
          </button>
        </div>
        <form
          onSubmit={handleCreateTask}
          className="flex-1 overflow-auto p-3"
          style={{ background: "#1b1b1b" }}
        >
          <div className="mb-3">
            <label className="block text-xs text-[#a0a0a0] mb-1.5">タイトル（必須）</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full px-2.5 py-2 text-[13px] rounded-md border outline-none"
              style={{ background: "#111", borderColor: "#3c3c3c", color: "#d4d4d4" }}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#a0a0a0] mb-1.5">説明</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full px-2.5 py-2 text-[13px] rounded-md border outline-none resize-y"
              style={{
                background: "#111",
                borderColor: "#3c3c3c",
                color: "#d4d4d4",
                minHeight: 90,
              }}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#a0a0a0] mb-1.5">書き込みスコープ（必須）</label>
            <input
              type="text"
              value={taskForm.writeScope}
              onChange={(e) => setTaskForm({ ...taskForm, writeScope: e.target.value })}
              className="w-full px-2.5 py-2 text-[13px] rounded-md border outline-none font-mono"
              style={{ background: "#111", borderColor: "#3c3c3c", color: "#d4d4d4" }}
              placeholder="src/**, tests/**"
              required
            />
            <p className="text-xs text-[#a0a0a0] mt-1.5">
              個人情報/秘密情報をAIから隠す場合は除外パターン（設定）を使用
            </p>
          </div>
        </form>
        <div
          className="h-15 px-3 flex items-center justify-end gap-2.5 border-t"
          style={{ borderColor: "#3c3c3c", background: "#252526" }}
        >
          <button
            type="button"
            onClick={() => setShowDrawer(false)}
            className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border"
            style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            onClick={handleCreateTask}
            disabled={createTaskMutation.isPending}
            className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border disabled:opacity-50"
            style={{
              background: "#0e639c",
              borderColor: "rgba(255,255,255,0.12)",
              color: "#d4d4d4",
            }}
          >
            {createTaskMutation.isPending ? "..." : "作成"}
          </button>
        </div>
      </div>
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
    </div>
  );
}
