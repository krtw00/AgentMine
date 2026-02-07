"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type Setting } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { useState, useEffect, useMemo } from "react";

export function DefaultExcludeEditor({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [newPattern, setNewPattern] = useState("");
  const [patterns, setPatterns] = useState<string[]>([]);

  // 設定を取得
  const { data: settings, isLoading } = useSettings(projectId);

  // 設定から scope.defaultExclude を取得
  const currentPatterns = useMemo(() => {
    const setting = settings?.find((s: Setting) => s.key === "scope.defaultExclude");
    if (!setting?.value) return [];
    
    const parsed = JSON.parse(setting.value as string);
    return Array.isArray(parsed) ? parsed : [];
  }, [settings]);

  // ローカル状態を初期化（設定が読み込まれたら）
  useEffect(() => {
    if (settings) {
      setPatterns(currentPatterns);
    }
  }, [settings, currentPatterns]);

  // 更新ミューテーション
  const updateMutation = useMutation({
    mutationFn: async (newPatterns: string[]) => {
      const res = await settingsApi.update(projectId, "scope.defaultExclude", newPatterns);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", projectId] });
    },
  });

  const handleAdd = () => {
    const trimmed = newPattern.trim();
    if (trimmed && !patterns.includes(trimmed)) {
      const updated = [...patterns, trimmed];
      setPatterns(updated);
      setNewPattern("");
    }
  };

  const handleRemove = (pattern: string) => {
    const updated = patterns.filter((p) => p !== pattern);
    setPatterns(updated);
  };

  const handleSave = () => {
    updateMutation.mutate(patterns);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 bg-zinc-700/50 border border-zinc-600 rounded text-sm text-zinc-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 現在のパターン一覧（チップ形式） */}
      {patterns.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {patterns.map((pattern) => (
            <div
              key={pattern}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-700/50 border border-zinc-600 rounded text-sm text-zinc-300"
            >
              <span className="font-mono text-xs">{pattern}</span>
              <button
                onClick={() => handleRemove(pattern)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={`${pattern} を削除`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 bg-zinc-700/50 border border-zinc-600 rounded text-sm text-zinc-500">
          除外パターンが設定されていません
        </div>
      )}

      {/* 追加フォーム */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: node_modules/** または *.log"
          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newPattern.trim() || patterns.includes(newPattern.trim())}
          className="px-3 py-1.5 bg-zinc-700 text-zinc-200 text-sm border border-zinc-600 rounded hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          追加
        </button>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || JSON.stringify(patterns) === JSON.stringify(currentPatterns)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? "保存中..." : "保存"}
        </button>
      </div>

      {/* エラー表示 */}
      {updateMutation.isError && (
        <div className="p-3 bg-red-900/20 border border-red-600/40 rounded text-sm text-red-400">
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : "保存に失敗しました"}
        </div>
      )}

      {/* 成功メッセージ */}
      {updateMutation.isSuccess && (
        <div className="p-3 bg-green-900/20 border border-green-600/40 rounded text-sm text-green-400">
          保存しました
        </div>
      )}
    </div>
  );
}

