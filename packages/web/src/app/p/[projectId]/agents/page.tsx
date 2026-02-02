"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { agentProfilesApi, runnersApi } from "@/lib/api";
import { useState } from "react";

export default function AgentProfilesPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    runner: "claude",
    model: "sonnet",
    defaultExclude: ".env,node_modules/**",
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["agentProfiles", projectId],
    queryFn: async () => {
      const res = await agentProfilesApi.list(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: runners } = useQuery({
    queryKey: ["runners"],
    queryFn: async () => {
      const res = await runnersApi.list();
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof agentProfilesApi.create>[1]) =>
      agentProfilesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentProfiles", projectId] });
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        runner: "claude",
        model: "sonnet",
        defaultExclude: ".env,node_modules/**",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: agentProfilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentProfiles", projectId] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      runner: formData.runner,
      model: formData.model || undefined,
      defaultExclude: formData.defaultExclude
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const selectedRunner = runners?.find((r) => r.name === formData.runner);

  if (isLoading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent Profiles</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? "キャンセル" : "新規Profile"}
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
              <label className="block text-sm font-medium mb-1">説明</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Runner</label>
              <select
                value={formData.runner}
                onChange={(e) =>
                  setFormData({ ...formData, runner: e.target.value, model: "" })
                }
                className="w-full px-3 py-2 border rounded"
              >
                {runners?.map((runner) => (
                  <option key={runner.name} value={runner.name}>
                    {runner.displayName}
                  </option>
                ))}
              </select>
            </div>
            {selectedRunner?.capabilities.supportsModel && (
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">選択してください</option>
                  {selectedRunner.capabilities.availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Exclude (カンマ区切り)
              </label>
              <input
                type="text"
                value={formData.defaultExclude}
                onChange={(e) =>
                  setFormData({ ...formData, defaultExclude: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder=".env,node_modules/**"
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

      {profiles && profiles.length > 0 ? (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="p-4 border rounded flex justify-between items-start"
            >
              <div>
                <div className="font-medium">{profile.name}</div>
                {profile.description && (
                  <p className="text-sm text-gray-500">{profile.description}</p>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {profile.runner}
                  {profile.model && ` / ${profile.model}`}
                </div>
                <div className="text-xs text-gray-400">
                  exclude: {profile.defaultExclude.join(", ") || "なし"}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm("このProfileを削除しますか？")) {
                    deleteMutation.mutate(profile.id);
                  }
                }}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">
          Agent Profileがありません。新規Profileを作成してください。
        </p>
      )}
    </div>
  );
}
