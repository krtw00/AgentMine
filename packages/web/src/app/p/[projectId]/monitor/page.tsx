"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { tasksApi, agentProfilesApi, runsApi, type Task, type Run } from "@/lib/api";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useAppStore, type OutputLine } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { TerminalOutput, parseStreamJsonLine } from "@/components/TerminalOutput";

type ExtendedRun = Run & { taskTitle: string; taskId: number; agentProfileName?: string };

const TIMELINE_STATUS_COLORS: Record<string, string> = {
  running: "rgba(204, 167, 0, 0.9)",
  completed: "rgba(137, 209, 133, 0.75)",
  failed: "rgba(241, 76, 76, 0.85)",
  cancelled: "rgba(113, 113, 122, 0.7)",
  needs_review: "rgba(204, 167, 0, 0.9)",
  ready: "rgba(14, 99, 156, 0.7)",
  pending: "rgba(113, 113, 122, 0.7)",
};

const formatDuration = (startedAt: string, finishedAt?: string | null) => {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ライブターミナルグリッド: 実行中のRunをShogun風に並べて表示
function LiveTerminalGrid({
  runs,
  runOutputs,
}: {
  runs: ExtendedRun[];
  runOutputs: Map<number, OutputLine[]>;
}) {
  // 実行中 + 最近出力があったRunを表示
  const liveRuns = useMemo(() => {
    const running = runs.filter((r) => r.status === "running");
    // 実行中がなければ、出力バッファがあるRunのうち最新のものを表示
    if (running.length === 0) {
      const withOutput = runs
        .filter((r) => runOutputs.has(r.id) && (runOutputs.get(r.id)?.length ?? 0) > 0)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 4);
      return withOutput;
    }
    return running;
  }, [runs, runOutputs]);

  if (liveRuns.length === 0) return null;

  const gridCols = liveRuns.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="mx-3 mt-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-semibold" style={{ color: "#d4d4d4" }}>
          ライブ実行
        </span>
        {liveRuns.some((r) => r.status === "running") && (
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#cca700" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            {liveRuns.filter((r) => r.status === "running").length} 件実行中
          </span>
        )}
      </div>
      <div className={`grid ${gridCols} gap-2`} style={{ maxHeight: 320 }}>
        {liveRuns.map((run) => (
          <LiveTerminalPane key={run.id} run={run} lines={runOutputs.get(run.id) ?? []} />
        ))}
      </div>
    </div>
  );
}

function LiveTerminalPane({ run, lines }: { run: ExtendedRun; lines: OutputLine[] }) {
  const paneRef = useRef<HTMLDivElement>(null);
  const isRunning = run.status === "running";

  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.scrollTop = paneRef.current.scrollHeight;
    }
  }, [lines.length]);

  const statusColor = isRunning
    ? "#cca700"
    : run.status === "completed"
      ? "#89d185"
      : run.status === "failed"
        ? "#f14c4c"
        : "#a0a0a0";

  return (
    <div
      className="rounded-lg border overflow-hidden flex flex-col"
      style={{ background: "#0d1117", borderColor: "#30363d", maxHeight: 320 }}
    >
      {/* ペインヘッダー */}
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
        <span className="text-[11px] font-semibold" style={{ color: "#c9d1d9" }}>
          実行 #{run.id}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border"
          style={{ color: "#8b949e", background: "#21262d", borderColor: "#30363d" }}
        >
          {run.taskTitle}
        </span>
        <span className="text-[10px] font-mono ml-auto" style={{ color: "#8b949e" }}>
          {run.agentProfileName}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "#8b949e" }}>
          {formatDuration(run.startedAt, run.finishedAt)}
        </span>
      </div>
      {/* ターミナル本体 */}
      <div
        ref={paneRef}
        className="flex-1 overflow-auto px-2 py-1.5 font-mono text-[10px] leading-[1.5]"
        style={{ minHeight: 80 }}
      >
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: "#484f58" }}>
            {isRunning ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                出力を待機中...
              </span>
            ) : (
              "出力なし"
            )}
          </div>
        ) : (
          lines.slice(-100).map((line, i) => {
            if (line.type === "system") {
              return (
                <div key={i} style={{ color: "#58a6ff" }}>
                  --- {line.data}
                </div>
              );
            }
            if (line.type === "stderr") {
              return (
                <div key={i} style={{ color: "#f85149" }}>
                  {line.data}
                </div>
              );
            }
            if (line.type === "exit") {
              const c = line.exitCode === 0 ? "#7ee787" : "#f85149";
              return (
                <div key={i} style={{ color: c }}>
                  EXIT code={line.exitCode}
                </div>
              );
            }
            // stdout: stream-jsonパース
            const raw = line.data ?? "";
            const jsonLines = raw.split("\n").filter((l) => l.trim());
            return (
              <div key={i}>
                {jsonLines.map((jl, j) => {
                  const parsed = parseStreamJsonLine(jl);
                  if (parsed) {
                    return (
                      <div key={j} className="flex gap-1">
                        <span className="shrink-0" style={{ color: parsed.color, opacity: 0.6 }}>
                          {parsed.label}
                        </span>
                        <span style={{ color: parsed.color, wordBreak: "break-all" }}>
                          {parsed.text.slice(0, 300)}
                        </span>
                      </div>
                    );
                  }
                  return jl.trim() ? (
                    <div key={j} style={{ color: "#c9d1d9" }}>
                      {jl.slice(0, 300)}
                    </div>
                  ) : null;
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();

  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detailsHidden, setDetailsHidden] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "output" | "meta" | "timing" | "checks" | "violations" | "git"
  >("output");
  const [searchQuery, setSearchQuery] = useState("");
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<number>>(new Set());
  const [taskForm, setTaskForm] = useState({ title: "", description: "", writeScope: "src/**" });
  const terminalRef = useRef<HTMLDivElement>(null);
  const runOutputs = useAppStore((s) => s.runOutputs);
  const selectedOutputs = selectedRunId ? (runOutputs.get(selectedRunId) ?? []) : [];

  // 自動スクロール
  useEffect(() => {
    if (terminalRef.current && activeTab === "output") {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [selectedOutputs.length, activeTab]);

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await tasksApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["agentProfiles", projectId],
    queryFn: async () => {
      const res = await agentProfilesApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: allRuns } = useQuery({
    queryKey: ["allRuns", projectId, tasks?.map((t) => t.id), profiles?.map((p) => p.id)],
    queryFn: async () => {
      if (!tasks) return [];
      const runsPromises = tasks.map((task) => runsApi.list(task.id));
      const results = await Promise.all(runsPromises);
      const runs: ExtendedRun[] = [];
      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) ?? []);
      results.forEach((res, i) => {
        const task = tasks[i];
        if ("data" in res && task) {
          res.data.forEach((run) => {
            runs.push({
              ...run,
              taskTitle: task.title,
              taskId: task.id,
              agentProfileName: profileMap.get(run.agentProfileId) ?? "-",
            });
          });
        }
      });
      return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    },
    enabled: !!tasks && !!profiles,
  });

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

  // タイムライン計算
  const timelineData = useMemo(() => {
    if (!filteredRuns || filteredRuns.length === 0) return null;
    const times = filteredRuns.map((r) => ({
      start: new Date(r.startedAt).getTime(),
      end: r.finishedAt ? new Date(r.finishedAt).getTime() : Date.now(),
    }));
    const minTime = Math.min(...times.map((t) => t.start));
    const maxTime = Math.max(...times.map((t) => t.end));
    return { minTime, maxTime, range: Math.max(maxTime - minTime, 1) };
  }, [filteredRuns]);

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description: string; writeScope: string[] }) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setShowDrawer(false);
      setTaskForm({ title: "", description: "", writeScope: "src/**" });
    },
  });

  const startRunMutation = useMutation({
    mutationFn: ({ taskId, agentProfileId }: { taskId: number; agentProfileId: number }) =>
      runsApi.create(taskId, agentProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["allRuns", projectId] });
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

  // タスクツリーの階層構築
  const taskTree = useMemo((): { rootTasks: Task[]; childMap: Map<number, Task[]> } => {
    if (!tasks) return { rootTasks: [], childMap: new Map() };
    const rootTasks = tasks.filter((t) => t.parentId === null);
    const childMap = new Map<number, Task[]>();
    tasks.forEach((t) => {
      if (t.parentId !== null) {
        const children = childMap.get(t.parentId) ?? [];
        children.push(t);
        childMap.set(t.parentId, children);
      }
    });
    return { rootTasks, childMap };
  }, [tasks]);

  const countRunsForTask = useCallback(
    (taskId: number): number => {
      const taskRuns = allRuns?.filter((r) => r.taskId === taskId).length ?? 0;
      const children = taskTree.childMap?.get(taskId) ?? [];
      return taskRuns + children.reduce((sum, child) => sum + countRunsForTask(child.id), 0);
    },
    [allRuns, taskTree.childMap]
  );

  // Overview SVG
  const overviewSvg = useMemo(() => {
    if (!filteredRuns || filteredRuns.length === 0 || !timelineData) return null;
    const width = 1000;
    const height = 64;
    const laneH = 6;
    const gap = 2;
    const topPad = 4;
    const maxLanes = Math.floor((height - topPad * 2 + gap) / (laneH + gap));

    const sorted = [...filteredRuns].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
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

    return {
      svg: [...gridLines, ...bars].join(""),
      ticks: [0, 0.25, 0.5, 0.75, 1].map((p) =>
        formatTime(new Date(timelineData.minTime + timelineData.range * p).toISOString())
      ),
    };
  }, [filteredRuns, timelineData]);

  if (tasksLoading) {
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
          <span className="text-[#d4d4d4]">
            タスク #{task.id}: {task.title}
          </span>
          <span className="ml-auto text-[10px] text-[#a0a0a0] font-mono">{runCount} 件</span>
        </div>
        {hasChildren && !isCollapsed && children.map((child) => renderTaskNode(child, depth + 1))}
      </div>
    );
  };

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
        <button
          onClick={() => setShowDrawer(true)}
          className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border"
          style={{ background: "#0e639c", borderColor: "rgba(255,255,255,0.12)", color: "#d4d4d4" }}
        >
          + タスク
        </button>
      </div>

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
        </div>

        {/* Right: Details Panel */}
        {!detailsHidden && selectedRun && (
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
    </div>
  );
}
