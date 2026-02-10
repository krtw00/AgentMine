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
  const selectedOutputs = selectedRunId ? runOutputs.get(selectedRunId) ?? [] : [];

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

  // 全runsをフラット化（タスク階層から抽出）
  const allRuns = useMemo((): ExtendedRun[] => {
    if (!monitorData) return [];
    const runs: ExtendedRun[] = [];
    const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) ?? []);

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

  const handleStartRun = (task: Task) => {
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

  const countRunsForTask = useCallback((task: MonitorTask): number => {
    return task.runs.length + task.children.reduce((sum, child) => sum + countRunsForTask(child), 0);
  }, []);

  // Overview SVG
  const overviewSvg = useMemo(() => {
    if (!allRuns || allRuns.length === 0 || !timelineData) return null;
    const width = 1000;
    const height = 64;
    const laneH = 6;
    const gap = 2;
    const topPad = 4;
    const maxLanes = Math.floor((height - topPad * 2 + gap) / (laneH + gap));

    const sorted = [...allRuns].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
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
          lane = laneEnd.reduce((best, val, idx) => (val < (laneEnd[best] ?? Infinity) ? idx : best), 0);
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
      const fill = STATUS_COLORS[run.status] || STATUS_COLORS.pending;
      return `<rect data-run-id="${run.id}" x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${laneH}" fill="${fill}" rx="2" style="cursor:pointer"><title>実行 #${run.id} (${run.status})</title></rect>`;
    });

    return { svg: [...gridLines, ...bars].join(""), ticks: [0, 0.25, 0.5, 0.75, 1].map((p) => formatTime(new Date(timelineData.minTime + timelineData.range * p).toISOString())) };
  }, [allRuns, timelineData]);

  if (monitorLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#1e1e1e" }}>
        <div className="flex items-center gap-3" style={{ color: "#a0a0a0" }}>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span style={{ fontSize: 12 }}>読み込み中...</span>
        </div>
      </div>
    );
  }


  return (
    <div className="h-full flex flex-col" style={{ background: "#1e1e1e", color: "#d4d4d4", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* Section Header */}
      <div className="px-3 py-2 border-b flex items-center gap-3 flex-wrap" style={{ background: "#252526", borderColor: "#3c3c3c" }}>
        <h2 className="text-[13px] font-semibold m-0">モニター（タスクツリー + テーブル）</h2>
        {monitorData && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#a0a0a0]">総タスク: <strong className="text-[#d4d4d4]">{monitorData.summary.total_tasks}</strong></span>
            <span className="text-[#a0a0a0]">実行中: <strong className="text-[#cca700]">{monitorData.summary.running_runs}</strong></span>
            <span className="text-[#a0a0a0]">レビュー待ち: <strong className="text-[#cca700]">{monitorData.summary.needs_review_tasks}</strong></span>
            <span className="text-[#a0a0a0]">失敗: <strong className="text-[#f14c4c]">{monitorData.summary.failed_tasks}</strong></span>
          </div>
        )}
        <div className="flex-1" />
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
      <div className="px-3 py-1.5 flex items-center gap-2 border-b" style={{ background: "#252526", borderColor: "#3c3c3c" }}>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full border" style={{ background: "#2d2d2d", borderColor: "#3c3c3c" }}>
          <span className="text-[#a0a0a0]">選択</span>
          <strong className="text-[#d4d4d4] font-semibold">{selectedTaskId === null ? "全タスク" : `タスク #${selectedTaskId}`}</strong>
        </span>
        {selectedTaskId !== null && (
          <button onClick={() => setSelectedTaskId(null)} className="text-[11px] text-[#4fc1ff] hover:underline">
            クリア
          </button>
        )}
      </div>

      {/* Overview */}
      {monitorData?.overview && <OverviewChart overview={monitorData.overview} />}

      {/* Live Terminal Grid (Shogun-style multi-pane) */}
      <LiveTerminalGrid runs={allRuns ?? []} runOutputs={runOutputs} />

      {/* Split: Tree + Table */}
      <div className={`flex-1 flex overflow-hidden ${detailsHidden ? "" : ""}`} style={{ minHeight: 0 }}>
        {/* Left */}
        <div className="flex-1 flex" style={{ borderRight: detailsHidden ? "none" : "1px solid #3c3c3c", minWidth: 0 }}>
          {/* Task Tree */}
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
        </div>

        {/* Right: Details Panel */}
        {!detailsHidden && selectedRun && (
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
    </div>
  );
}
