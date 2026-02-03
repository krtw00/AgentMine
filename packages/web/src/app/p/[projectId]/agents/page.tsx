"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { agentProfilesApi, runnersApi, type AgentProfile } from "@/lib/api";
import { useState } from "react";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const MDPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false }
);

// Claude CLIのビルトインツール
const CLAUDE_TOOLS = [
  { id: "Bash", desc: "シェルコマンド実行" },
  { id: "Read", desc: "ファイル読み取り" },
  { id: "Edit", desc: "ファイル編集" },
  { id: "Write", desc: "ファイル書き込み" },
  { id: "Glob", desc: "ファイルパターン検索" },
  { id: "Grep", desc: "テキスト検索" },
  { id: "WebFetch", desc: "URL取得" },
  { id: "WebSearch", desc: "Web検索" },
  { id: "NotebookEdit", desc: "Jupyter編集" },
  { id: "Agent", desc: "サブエージェント" },
];

type FormTab = "basic" | "prompt" | "tools";

interface FormData {
  id: number | null; // 編集時はID、新規はnull
  name: string;
  description: string;
  runner: string;
  model: string;
  promptTemplate: string;
  defaultExclude: string;
  // Claude ツール設定
  tools: string[];
  disallowedTools: string[];
  // Codex設定
  approvalPolicy: string;
  sandbox: string;
}

const INITIAL_FORM: FormData = {
  id: null,
  name: "",
  description: "",
  runner: "claude",
  model: "sonnet",
  promptTemplate: "",
  defaultExclude: ".env,.env.*,node_modules/**,.git/**,*.db,pnpm-lock.yaml",
  tools: [],
  disallowedTools: [],
  approvalPolicy: "never",
  sandbox: "danger-full-access",
};

function profileToForm(p: AgentProfile): FormData {
  const cfg = (p.config ?? {}) as Record<string, unknown>;
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    runner: p.runner,
    model: p.model ?? "",
    promptTemplate: p.promptTemplate ?? "",
    defaultExclude: p.defaultExclude.join(", "),
    tools: Array.isArray(cfg.tools) ? (cfg.tools as string[]) : [],
    disallowedTools: Array.isArray(cfg.disallowedTools) ? (cfg.disallowedTools as string[]) : [],
    approvalPolicy: typeof cfg.approvalPolicy === "string" ? cfg.approvalPolicy : "never",
    sandbox: typeof cfg.sandbox === "string" ? cfg.sandbox : "danger-full-access",
  };
}

function formToPayload(f: FormData) {
  let config: Record<string, unknown> | undefined;
  if (f.runner === "claude") {
    const c: Record<string, unknown> = {};
    if (f.tools.length > 0) c.tools = f.tools;
    if (f.disallowedTools.length > 0) c.disallowedTools = f.disallowedTools;
    if (Object.keys(c).length > 0) config = c;
  } else if (f.runner === "codex") {
    config = {
      approvalPolicy: f.approvalPolicy,
      sandbox: f.sandbox,
    };
  }
  return {
    name: f.name,
    description: f.description || undefined,
    runner: f.runner,
    model: f.model || undefined,
    promptTemplate: f.promptTemplate || undefined,
    defaultExclude: f.defaultExclude
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    config,
  };
}

export default function AgentProfilesPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>("basic");
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof agentProfilesApi.update>[1] }) =>
      agentProfilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentProfiles", projectId] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: agentProfilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentProfiles", projectId] });
    },
  });

  const closeForm = () => {
    setShowForm(false);
    setFormData(INITIAL_FORM);
    setActiveTab("basic");
  };

  const openNew = () => {
    setFormData(INITIAL_FORM);
    setActiveTab("basic");
    setShowForm(true);
  };

  const openEdit = (p: AgentProfile) => {
    setFormData(profileToForm(p));
    setActiveTab("basic");
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formToPayload(formData);
    if (formData.id) {
      updateMutation.mutate({ id: formData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTool = (list: "tools" | "disallowedTools", toolId: string) => {
    setFormData((prev) => {
      const current = prev[list];
      const next = current.includes(toolId)
        ? current.filter((t) => t !== toolId)
        : [...current, toolId];
      return { ...prev, [list]: next };
    });
  };

  const selectedRunner = runners?.find((r) => r.name === formData.runner);

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

  const tabs: { key: FormTab; label: string }[] = [
    { key: "basic", label: "基本" },
    { key: "prompt", label: "プロンプト" },
    { key: "tools", label: "ツール設定" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold text-zinc-100">エージェントプロファイル</h1>
          <div className="text-xs text-zinc-500">{profiles?.length || 0} 件</div>
        </div>
        <button
          onClick={showForm ? closeForm : openNew}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
        >
          {showForm ? "キャンセル" : "+ 新規プロファイル"}
        </button>
      </div>

      {/* Form (full-screen when open) */}
      {showForm && (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-800/50">
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-zinc-700 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-xs font-medium transition ${
                    activeTab === tab.key
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {formData.id && (
                <div className="ml-auto flex items-center px-3 text-xs text-zinc-500">
                  編集中: <span className="text-zinc-300 ml-1 font-medium">{formData.name}</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-auto p-4">
              {/* Basic Tab */}
              {activeTab === "basic" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">名前</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                      placeholder="worker-standard"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">説明</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                      placeholder="標準Worker: コード実装・修正用"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">ランナー</label>
                    <select
                      value={formData.runner}
                      onChange={(e) => setFormData({ ...formData, runner: e.target.value, model: "" })}
                      className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
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
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">モデル</label>
                      <select
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
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
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      除外パターン（カンマ区切り）
                    </label>
                    <input
                      type="text"
                      value={formData.defaultExclude}
                      onChange={(e) => setFormData({ ...formData, defaultExclude: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                      placeholder=".env, node_modules/**, .git/**"
                    />
                  </div>
                </div>
              )}

              {/* Prompt Tab - fills remaining space */}
              {activeTab === "prompt" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 shrink-0">
                    プロンプトテンプレート
                  </label>
                  <div data-color-mode="dark" className="flex-1 min-h-0">
                    <MDEditor
                      value={formData.promptTemplate}
                      onChange={(v) => setFormData({ ...formData, promptTemplate: v ?? "" })}
                      height="100%"
                      preview="live"
                      visibleDragbar={false}
                      textareaProps={{
                        placeholder:
                          "タスク実行時の追加指示をMarkdownで記述。空欄ならデフォルトプロンプトを使用。",
                      }}
                    />
                  </div>
                  <div className="mt-1.5 text-xs text-zinc-500 shrink-0">
                    このプロンプトはタスクの指示の前に挿入されます（Markdown記法対応）
                  </div>
                </div>
              )}

              {/* Tools Tab */}
              {activeTab === "tools" && (
                <div>
                  {formData.runner === "claude" && (
                    <div className="space-y-4">
                      {/* 許可ツール */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-zinc-400">
                            許可ツール（--tools）
                          </label>
                          <span className="text-xs text-zinc-500">
                            {formData.tools.length === 0
                              ? "未設定 = 全ツール利用可"
                              : `${formData.tools.length}個選択`}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CLAUDE_TOOLS.map((tool) => (
                            <label
                              key={`tool-${tool.id}`}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs cursor-pointer transition ${
                                formData.tools.includes(tool.id)
                                  ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
                                  : "bg-zinc-700/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.tools.includes(tool.id)}
                                onChange={() => toggleTool("tools", tool.id)}
                                className="sr-only"
                              />
                              <span className="font-mono font-medium">{tool.id}</span>
                              <span className="text-zinc-500">{tool.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 無効ツール */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-zinc-400">
                            無効ツール（--disallowedTools）
                          </label>
                          <span className="text-xs text-zinc-500">
                            {formData.disallowedTools.length === 0
                              ? "なし"
                              : `${formData.disallowedTools.length}個ブロック`}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CLAUDE_TOOLS.map((tool) => (
                            <label
                              key={`disallow-${tool.id}`}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs cursor-pointer transition ${
                                formData.disallowedTools.includes(tool.id)
                                  ? "bg-red-600/20 text-red-300 border border-red-600/40"
                                  : "bg-zinc-700/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.disallowedTools.includes(tool.id)}
                                onChange={() => toggleTool("disallowedTools", tool.id)}
                                className="sr-only"
                              />
                              <span className="font-mono font-medium">{tool.id}</span>
                              <span className="text-zinc-500">{tool.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.runner === "codex" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          承認ポリシー（--approval-policy）
                        </label>
                        <select
                          value={formData.approvalPolicy}
                          onChange={(e) => setFormData({ ...formData, approvalPolicy: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="never">never（全自動）</option>
                          <option value="on-request">on-request</option>
                          <option value="on-failure">on-failure</option>
                          <option value="untrusted">untrusted（全承認要求）</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          サンドボックス（--sandbox）
                        </label>
                        <select
                          value={formData.sandbox}
                          onChange={(e) => setFormData({ ...formData, sandbox: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="danger-full-access">danger-full-access（全アクセス）</option>
                          <option value="workspace-write">workspace-write</option>
                          <option value="read-only">read-only</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {formData.runner !== "claude" && formData.runner !== "codex" && (
                    <div className="text-sm text-zinc-500 py-4 text-center">
                      このランナーにはツール設定オプションがありません
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions (sticky bottom) */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700 shrink-0 bg-zinc-800/80">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "保存中..."
                  : formData.id
                  ? "更新"
                  : "作成"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List (hidden when form is open) */}
      {!showForm && <div className="flex-1 overflow-auto p-4">
        {profiles && profiles.length > 0 ? (
          <div className="space-y-2">
            {profiles.map((profile) => {
              const cfg = (profile.config ?? {}) as Record<string, unknown>;
              const toolCount = Array.isArray(cfg.tools) ? cfg.tools.length : 0;
              const disallowCount = Array.isArray(cfg.disallowedTools) ? cfg.disallowedTools.length : 0;
              const isExpanded = expandedIds.has(profile.id);

              return (
                <div
                  key={profile.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 transition"
                >
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">{profile.name}</span>
                        {profile.description && (
                          <span className="text-xs text-zinc-500 truncate">
                            {profile.description}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded border border-blue-600/40">
                          {profile.runner}
                        </span>
                        {profile.model && (
                          <span className="text-xs px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded border border-purple-600/40">
                            {profile.model}
                          </span>
                        )}
                        {profile.promptTemplate && (
                          <span className="text-xs px-2 py-0.5 bg-amber-600/20 text-amber-400 rounded border border-amber-600/40">
                            prompt
                          </span>
                        )}
                        {toolCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-600/20 text-emerald-400 rounded border border-emerald-600/40">
                            tools: {toolCount}
                          </span>
                        )}
                        {disallowCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-400 rounded border border-red-600/40">
                            blocked: {disallowCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => toggleExpand(profile.id)}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition"
                      >
                        {isExpanded ? "閉じる" : "詳細"}
                      </button>
                      <button
                        onClick={() => openEdit(profile)}
                        className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-600/10 rounded transition"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("このプロファイルを削除しますか？")) {
                            deleteMutation.mutate(profile.id);
                          }
                        }}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-600/10 rounded transition"
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-700/50 pt-3 space-y-2">
                      {profile.promptTemplate && (
                        <div>
                          <div className="text-xs font-medium text-zinc-500 mb-1">プロンプト</div>
                          <div data-color-mode="dark" className="text-xs bg-zinc-900/50 rounded max-h-48 overflow-auto">
                            <MDPreview source={profile.promptTemplate} style={{ background: "transparent", fontSize: "12px", padding: "8px 12px" }} />
                          </div>
                        </div>
                      )}
                      {(toolCount > 0 || disallowCount > 0) && (
                        <div>
                          <div className="text-xs font-medium text-zinc-500 mb-1">ツール設定</div>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(cfg.tools) &&
                              (cfg.tools as string[]).map((t) => (
                                <span
                                  key={`t-${t}`}
                                  className="text-xs px-1.5 py-0.5 bg-emerald-600/10 text-emerald-400 rounded font-mono"
                                >
                                  {t}
                                </span>
                              ))}
                            {Array.isArray(cfg.disallowedTools) &&
                              (cfg.disallowedTools as string[]).map((t) => (
                                <span
                                  key={`d-${t}`}
                                  className="text-xs px-1.5 py-0.5 bg-red-600/10 text-red-400 rounded font-mono line-through"
                                >
                                  {t}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-zinc-500">
                        除外: {profile.defaultExclude.join(", ") || "なし"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <div className="w-16 h-16 mb-4 bg-zinc-800 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <p>プロファイルがありません</p>
            <p className="text-sm mt-1 text-zinc-600">新規プロファイルを作成してエージェントを設定</p>
          </div>
        )}
      </div>}
    </div>
  );
}
