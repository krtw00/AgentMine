"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { tasksApi, runsApi, type Run } from "@/lib/api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-300 text-gray-600",
};

export default function RunsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  // Tasks取得してからRunsを取得
  const { data: tasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await tasksApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  // 全TaskのRunsを取得
  const { data: allRuns, isLoading } = useQuery({
    queryKey: ["allRuns", projectId, tasks?.map((t) => t.id)],
    queryFn: async () => {
      if (!tasks) return [];
      const runsPromises = tasks.map((task) => runsApi.list(task.id));
      const results = await Promise.all(runsPromises);
      const runs: (Run & { taskTitle: string })[] = [];
      results.forEach((res, i) => {
        if ("data" in res) {
          res.data.forEach((run) => {
            runs.push({ ...run, taskTitle: tasks[i].title });
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
    return <p className="text-gray-500">読み込み中...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Runs</h1>

      {allRuns && allRuns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border">ID</th>
                <th className="text-left p-3 border">Task</th>
                <th className="text-left p-3 border">Status</th>
                <th className="text-left p-3 border">Started</th>
                <th className="text-left p-3 border">Finished</th>
                <th className="text-left p-3 border">DoD</th>
                <th className="text-left p-3 border">Violations</th>
              </tr>
            </thead>
            <tbody>
              {allRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="p-3 border">
                    <Link
                      href={`/p/${projectId}/runs/${run.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      #{run.id}
                    </Link>
                  </td>
                  <td className="p-3 border">{run.taskTitle}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        STATUS_COLORS[run.status] || "bg-gray-200"
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="p-3 border text-sm">
                    {new Date(run.startedAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-3 border text-sm">
                    {run.finishedAt
                      ? new Date(run.finishedAt).toLocaleString("ja-JP")
                      : "-"}
                  </td>
                  <td className="p-3 border">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        run.dodStatus === "passed"
                          ? "bg-green-100 text-green-800"
                          : run.dodStatus === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {run.dodStatus || "pending"}
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    {run.scopeViolationCount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Runがありません。</p>
      )}
    </div>
  );
}
