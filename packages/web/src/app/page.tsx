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
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
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
    <main className="min-h-screen bg-zinc-900 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h1 className="text-3xl font-bold text-zinc-100">AgentMine</h1>
          </div>
          <p className="text-zinc-400">AI作業実行プラットフォーム</p>
        </div>

        {/* Projects Card */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">プロジェクト</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              {showForm ? "キャンセル" : "+ 新規プロジェクト"}
            </button>
          </div>

          {/* Create Form */}
          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-zinc-700/50 border border-zinc-600 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">プロジェクト名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                    placeholder="my-project"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">リポジトリパス</label>
                  <input
                    type="text"
                    value={formData.repoPath}
                    onChange={(e) => setFormData({ ...formData, repoPath: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                    placeholder="/home/user/projects/my-repo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">ベースブランチ</label>
                  <input
                    type="text"
                    value={formData.baseBranch}
                    onChange={(e) => setFormData({ ...formData, baseBranch: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                    placeholder="main"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {createMutation.isPending ? "作成中..." : "作成"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-zinc-600 text-zinc-100 text-sm rounded hover:bg-zinc-500 transition"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Project List */}
          {data && data.length > 0 ? (
            <div className="space-y-2">
              {data.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className="w-full text-left p-4 bg-zinc-700/50 border border-zinc-600 rounded-lg hover:border-blue-500 hover:bg-zinc-700 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-zinc-100 mb-1">{project.name}</div>
                      <div className="text-sm text-zinc-400 mb-1">{project.repoPath}</div>
                      <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                        {project.baseBranch}
                      </span>
                    </div>
                    <svg
                      className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-700/30 border border-dashed border-zinc-600 rounded-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-zinc-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-zinc-400">プロジェクトがありません</p>
              <p className="text-sm text-zinc-500 mt-1">「+ 新規プロジェクト」をクリックして開始</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
