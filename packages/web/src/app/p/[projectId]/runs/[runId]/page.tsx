"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { runsApi } from "@/lib/api";
import { useState } from "react";

export default function RunDetailPage() {
  const params = useParams();
  const runId = Number(params.runId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"output" | "checks" | "violations">(
    "output"
  );

  const { data: run, isLoading } = useQuery({
    queryKey: ["run", runId],
    queryFn: async () => {
      const res = await runsApi.get(runId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

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
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (!run) {
    return <p className="text-red-500">Runが見つかりません。</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Run #{run.id}</h1>
          <p className="text-gray-500">{run.taskTitle}</p>
        </div>
        <div className="flex gap-2">
          {run.status === "running" && (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              停止
            </button>
          )}
          {(run.status === "failed" || run.status === "cancelled") && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              リトライ
            </button>
          )}
        </div>
      </div>

      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
        <div>
          <span className="text-sm text-gray-500">Status</span>
          <p className="font-medium">{run.status}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Agent Profile</span>
          <p className="font-medium">{run.agentProfileName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Branch</span>
          <p className="font-mono text-sm">{run.branchName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Exit Code</span>
          <p className="font-medium">{run.exitCode ?? "-"}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Started</span>
          <p>{new Date(run.startedAt).toLocaleString("ja-JP")}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Finished</span>
          <p>
            {run.finishedAt
              ? new Date(run.finishedAt).toLocaleString("ja-JP")
              : "-"}
          </p>
        </div>
      </div>

      {/* タブ */}
      <div className="border-b mb-4">
        <nav className="flex gap-4">
          {(["output", "checks", "violations"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "output" && "Output"}
              {tab === "checks" && `Checks (${run.checks.length})`}
              {tab === "violations" && `Violations (${run.scopeViolations.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "output" && (
        <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-auto max-h-96">
          <p className="text-gray-500">
            ログは実装中です。RunnerAdapter統合後に表示されます。
          </p>
        </div>
      )}

      {activeTab === "checks" && (
        <div>
          {run.checks.length > 0 ? (
            <div className="space-y-2">
              {run.checks.map((check) => (
                <div
                  key={check.id}
                  className="p-3 border rounded flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{check.label}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({check.checkKey})
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      check.status === "passed"
                        ? "bg-green-100 text-green-800"
                        : check.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Checkがありません。</p>
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
                  className="p-3 border rounded flex justify-between items-center"
                >
                  <div>
                    <span className="font-mono text-sm">{v.path}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({v.reason})
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      v.approvedStatus === "approved"
                        ? "bg-green-100 text-green-800"
                        : v.approvedStatus === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {v.approvedStatus}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Scope Violationがありません。</p>
          )}
        </div>
      )}
    </div>
  );
}
