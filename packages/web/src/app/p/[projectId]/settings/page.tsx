"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { settingsApi, type RequiredCheck } from "@/lib/api";

export default function SettingsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  const [checks, setChecks] = useState<RequiredCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 新規追加フォームの状態
  const [newCheck, setNewCheck] = useState<RequiredCheck>({
    check_key: "",
    label: "",
    command: "",
    timeout_sec: undefined,
  });

  useEffect(() => {
    settingsApi.get(projectId).then((res) => {
      if ("data" in res) {
        setChecks(res.data.dod?.requiredChecks ?? []);
      }
      setLoading(false);
    });
  }, [projectId]);

  const handleAdd = () => {
    if (!newCheck.check_key || !newCheck.label || !newCheck.command) return;
    if (checks.some((c) => c.check_key === newCheck.check_key)) {
      setError(`check_key "${newCheck.check_key}" は既に存在します`);
      return;
    }
    setChecks([...checks, { ...newCheck }]);
    setNewCheck({ check_key: "", label: "", command: "", timeout_sec: undefined });
    setError(null);
  };

  const handleDelete = (check_key: string) => {
    setChecks(checks.filter((c) => c.check_key !== check_key));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const res = await settingsApi.update(projectId, {
      dod: { requiredChecks: checks },
    });
    setSaving(false);
    if ("error" in res) {
      setError(res.error.message);
    } else {
      setChecks(res.data.dod?.requiredChecks ?? []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center border-b border-zinc-700 bg-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-100">プロジェクト設定</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* DoD Required Checks */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">
            完了定義チェック (dod.requiredChecks)
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Runの完了条件となる必須チェックを定義します。
          </p>

          {loading ? (
            <div className="text-xs text-zinc-500">読み込み中...</div>
          ) : (
            <>
              {/* チェック一覧 */}
              {checks.length > 0 && (
                <div className="space-y-2 mb-4">
                  {checks.map((check) => (
                    <div
                      key={check.check_key}
                      className="flex items-start gap-2 p-3 bg-zinc-700/50 border border-zinc-600 rounded"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-300 bg-zinc-700 px-1.5 py-0.5 rounded">
                            {check.check_key}
                          </span>
                          <span className="text-xs text-zinc-300">{check.label}</span>
                          {check.timeout_sec != null && (
                            <span className="text-xs text-zinc-500">({check.timeout_sec}s)</span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-zinc-400 truncate">
                          {check.command}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(check.check_key)}
                        className="shrink-0 text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 追加フォーム */}
              <div className="space-y-2 p-3 bg-zinc-700/30 border border-zinc-600 rounded">
                <div className="text-xs text-zinc-400 font-medium mb-2">チェックを追加</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="check_key (例: lint)"
                    value={newCheck.check_key}
                    onChange={(e) => setNewCheck({ ...newCheck, check_key: e.target.value })}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                  />
                  <input
                    type="text"
                    placeholder="label (例: Lint)"
                    value={newCheck.label}
                    onChange={(e) => setNewCheck({ ...newCheck, label: e.target.value })}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <input
                  type="text"
                  placeholder="command (例: pnpm lint)"
                  value={newCheck.command}
                  onChange={(e) => setNewCheck({ ...newCheck, command: e.target.value })}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="timeout_sec (任意)"
                    value={newCheck.timeout_sec ?? ""}
                    onChange={(e) =>
                      setNewCheck({
                        ...newCheck,
                        timeout_sec: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-40 px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newCheck.check_key || !newCheck.label || !newCheck.command}
                    className="px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-zinc-100 rounded transition-colors"
                  >
                    追加
                  </button>
                </div>
              </div>

              {error && <div className="mt-2 text-xs text-red-400">{error}</div>}

              {/* 保存ボタン */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white rounded transition-colors"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                {success && <span className="text-xs text-green-400">保存しました</span>}
              </div>
            </>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-zinc-800 border border-red-900/50 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-red-400 mb-2">危険な操作</h2>
          <p className="text-xs text-zinc-500 mb-4">
            プロジェクトの削除やリセットなどの取り消しできない操作。
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="px-3 py-1.5 bg-red-600/20 text-red-400 text-xs border border-red-600/40 rounded opacity-50 cursor-not-allowed"
            >
              プロジェクトを削除
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
