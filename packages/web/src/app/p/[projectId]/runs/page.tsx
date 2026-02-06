"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { tasksApi, runsApi, type Run } from "@/lib/api";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

export default function RunsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  const { data: tasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await tasksApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: allRuns, isLoading } = useQuery({
    queryKey: ["allRuns", projectId, tasks?.map((t) => t.id)],
    queryFn: async () => {
      if (!tasks) return [];
      const runsPromises = tasks.map((task) => runsApi.list(task.id));
      const results = await Promise.all(runsPromises);
      const runs: (Run & { taskTitle: string })[] = [];
      results.forEach((res, i) => {
        const task = tasks[i];
        if ("data" in res && task) {
          res.data.forEach((run) => {
            runs.push({ ...run, taskTitle: task.title });
          });
        }
      });
      return runs.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    },
    enabled: !!tasks,
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-700 bg-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-100">実行履歴</h1>
        <div className="text-xs text-zinc-500">
          {allRuns?.length || 0} 件
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {allRuns && allRuns.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-zinc-800 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">ID</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">タスク</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">ステータス</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">開始</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">終了</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">完了定義</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-400 border-b border-zinc-700">違反</th>
              </tr>
            </thead>
            <tbody>
              {allRuns.map((run) => (
                <tr key={run.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/p/${projectId}/runs/${run.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      #{run.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{run.taskTitle}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} variant="tag" /></td>
                  <td className="px-4 py-3 text-zinc-400">{new Date(run.startedAt).toLocaleString("ja-JP")}</td>
                  <td className="px-4 py-3 text-zinc-400">{run.finishedAt ? new Date(run.finishedAt).toLocaleString("ja-JP") : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                      run.dodStatus === "passed"
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40"
                        : run.dodStatus === "failed"
                        ? "bg-red-600/20 text-red-400 border border-red-600/40"
                        : "bg-zinc-600/30 text-zinc-400 border border-zinc-600"
                    }`}>
                      {run.dodStatus || "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400">{run.scopeViolationCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <div className="w-16 h-16 mb-4 bg-zinc-800 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p>実行履歴がありません</p>
            <p className="text-sm mt-1 text-zinc-600">タスクを実行すると履歴が表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
}
