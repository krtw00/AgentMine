"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { runsApi, type RunLogLine } from "@/lib/api";
import { useState, useRef, useEffect } from "react";

const STATUS_STYLES: Record<string, string> = {
  running: "bg-blue-600/20 text-blue-400 border border-blue-600/40",
  completed: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
  failed: "bg-red-600/20 text-red-400 border border-red-600/40",
  cancelled: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
  passed: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
  pending: "bg-zinc-600/30 text-zinc-400 border border-zinc-600",
  approved: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
  rejected: "bg-red-600/20 text-red-400 border border-red-600/40",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
    {status}
  </span>
);

export default function RunDetailPage() {
  const params = useParams();
  const runId = Number(params.runId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"output" | "checks" | "violations">("output");

  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ["run", runId],
    queryFn: async () => {
      const res = await runsApi.get(runId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["runLogs", runId],
    queryFn: async () => {
      const res = await runsApi.getLogs(runId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
    refetchInterval: run?.status === "running" ? 3000 : false,
  });

  useEffect(() => {
    if (activeTab === "output" && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  const stopMutation = useMutation({
    mutationFn: () => runsApi.stop(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => runsApi.retry(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400">実行が見つかりません。</p>
      </div>
    );
  }

  const tabs = [
    { key: "output" as const, label: "出力" },
    { key: "checks" as const, label: `チェック (${run.checks.length})` },
    { key: "violations" as const, label: `違反 (${run.scopeViolations.length})` },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold text-zinc-100">実行 #{run.id}</h1>
          <StatusBadge status={run.status} />
          <span className="text-xs text-zinc-500">{run.taskTitle}</span>
        </div>
        <div className="flex gap-2">
          {run.status === "running" && (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 transition"
            >
              停止
            </button>
          )}
          {(run.status === "failed" || run.status === "cancelled") && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              再実行
            </button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-zinc-700 bg-zinc-800/50 text-xs">
        <div>
          <div className="text-zinc-500 mb-1">プロファイル</div>
          <div className="text-zinc-200">{run.agentProfileName}</div>
        </div>
        <div>
          <div className="text-zinc-500 mb-1">ブランチ</div>
          <div className="text-blue-400 font-mono">{run.branchName}</div>
        </div>
        <div>
          <div className="text-zinc-500 mb-1">終了コード</div>
          <div className="text-zinc-200">{run.exitCode ?? "-"}</div>
        </div>
        <div>
          <div className="text-zinc-500 mb-1">完了定義</div>
          <StatusBadge status={run.dodStatus || "pending"} />
        </div>
        <div>
          <div className="text-zinc-500 mb-1">開始</div>
          <div className="text-zinc-300">{new Date(run.startedAt).toLocaleString("ja-JP")}</div>
        </div>
        <div>
          <div className="text-zinc-500 mb-1">終了</div>
          <div className="text-zinc-300">{run.finishedAt ? new Date(run.finishedAt).toLocaleString("ja-JP") : "-"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-zinc-700 bg-zinc-800/30">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 text-xs border-b-2 transition ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "output" && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 font-mono text-xs h-full overflow-auto">
            {logs && logs.length > 0 ? (
              <>
                {logs.map((line, i) => (
                  <div key={i} className="py-0.5 flex gap-2">
                    <span className="text-zinc-600 shrink-0 select-none w-20">
                      {new Date(line.timestamp).toLocaleTimeString("ja-JP")}
                    </span>
                    {line.type === "exit" ? (
                      <span className={line.exitCode === 0 ? "text-emerald-400" : "text-red-400"}>
                        --- exit code: {line.exitCode} ---
                      </span>
                    ) : (
                      <span
                        className={`whitespace-pre-wrap break-all ${
                          line.type === "stderr" ? "text-red-400" : "text-zinc-300"
                        }`}
                      >
                        {line.data}
                      </span>
                    )}
                  </div>
                ))}
                <div ref={logEndRef} />
              </>
            ) : (
              <p className="text-zinc-500 py-4 text-center">
                {run.status === "running" ? "出力を待機中..." : "ログがありません"}
              </p>
            )}
          </div>
        )}

        {activeTab === "checks" && (
          <div>
            {run.checks.length > 0 ? (
              <div className="space-y-2">
                {run.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium text-zinc-200">{check.label}</span>
                      <span className="text-xs text-zinc-500 ml-2 font-mono">
                        ({check.checkKey})
                      </span>
                    </div>
                    <StatusBadge status={check.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <p>チェック項目がありません</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "violations" && (
          <div>
            {run.scopeViolations.length > 0 ? (
              <div className="space-y-2">
                {run.scopeViolations.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <span className="font-mono text-sm text-zinc-200">{v.path}</span>
                      <span className="text-xs text-zinc-500 ml-2">
                        ({v.reason})
                      </span>
                    </div>
                    <StatusBadge status={v.approvedStatus} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <p>スコープ違反がありません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
