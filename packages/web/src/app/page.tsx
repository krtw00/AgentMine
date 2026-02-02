"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, type Project } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProjectSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    repoPath: "",
    baseBranch: "main",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await projectsApi.list();
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setFormData({ name: "", repoPath: "", baseBranch: "main" });
    },
  });

  const handleSelect = (project: Project) => {
    router.push(`/p/${project.id}/monitor`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">AgentMine</h1>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showForm ? "キャンセル" : "新規Project"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 p-4 border rounded bg-gray-50"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名前</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  リポジトリパス
                </label>
                <input
                  type="text"
                  value={formData.repoPath}
                  onChange={(e) =>
                    setFormData({ ...formData, repoPath: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="/path/to/repo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  基準ブランチ
                </label>
                <input
                  type="text"
                  value={formData.baseBranch}
                  onChange={(e) =>
                    setFormData({ ...formData, baseBranch: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "作成中..." : "作成"}
              </button>
            </div>
          </form>
        )}

        {data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
                className="w-full text-left p-4 border rounded hover:bg-gray-50 transition"
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-sm text-gray-500">{project.repoPath}</div>
                <div className="text-xs text-gray-400">
                  {project.baseBranch}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Projectがありません。新規Projectを作成してください。
          </p>
        )}
      </div>
    </main>
  );
}
