"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { tasksApi, agentProfilesApi, runsApi, type Task } from "@/lib/api";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

const STATUS_COLORS: Record<string, string> = {
  ready: "bg-gray-200 text-gray-800",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-300 text-gray-600",
  needs_review: "bg-yellow-100 text-yellow-800",
  blocked: "bg-orange-100 text-orange-800",
};

export default function MonitorPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();
  const selectedRunId = useAppStore((s) => s.selectedRunId);
  const setSelectedRun = useAppStore((s) => s.setSelectedRun);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    writeScope: "src/**",
  });

  // Tasks取得
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await tasksApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  // Agent Profiles取得
  const { data: profiles } = useQuery({
    queryKey: ["agentProfiles", projectId],
    queryFn: async () => {
      const res = await agentProfilesApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  // Task作成
  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description: string; writeScope: string[] }) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setShowTaskForm(false);
      setTaskForm({ title: "", description: "", writeScope: "src/**" });
    },
  });

  // Run開始
  const startRunMutation = useMutation({
    mutationFn: ({ taskId, agentProfileId }: { taskId: number; agentProfileId: number }) =>
      runsApi.create(taskId, agentProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
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
    if (!profiles || profiles.length === 0) {
      alert("Agent Profileを先に作成してください");
      return;
    }
    startRunMutation.mutate({
      taskId: task.id,
      agentProfileId: profiles[0].id,
    });
  };

  if (tasksLoading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Monitor</h1>
        <button
          onClick={() => setShowTaskForm(!showTaskForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showTaskForm ? "キャンセル" : "新規Task"}
        </button>
      </div>

      {/* Task作成フォーム */}
      {showTaskForm && (
        <form
          onSubmit={handleCreateTask}
          className="mb-6 p-4 border rounded bg-gray-50"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">説明</label>
              <textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Write Scope (カンマ区切り)
              </label>
              <input
                type="text"
                value={taskForm.writeScope}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, writeScope: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder="src/**, tests/**"
                required
              />
            </div>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {createTaskMutation.isPending ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      )}

      {/* Task一覧 */}
      {tasks && tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 border rounded hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        STATUS_COLORS[task.status] || "bg-gray-200"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {task.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    scope: {task.writeScope.join(", ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status === "ready" && (
                    <button
                      onClick={() => handleStartRun(task)}
                      disabled={startRunMutation.isPending}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Run開始
                    </button>
                  )}
                  {task.status === "running" && (
                    <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                      実行中...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Taskがありません。新規Taskを作成してください。</p>
      )}
    </div>
  );
}
