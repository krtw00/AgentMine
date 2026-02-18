"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type Setting } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { useState, useEffect, useMemo } from "react";
import type { DodRequiredCheck } from "@agentmine/shared";

// slugify関数: labelからcheck_keyを生成
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "-") // 記号を - に置換
    .replace(/[\s_-]+/g, "-") // スペース、アンダースコア、ハイフンをハイフンに統一（連続する - を1つに）
    .replace(/^-+|-+$/g, ""); // 先頭・末尾のハイフンを削除
}

export function RequiredChecksEditor({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [newTimeoutSec, setNewTimeoutSec] = useState<string>("");
  const [checks, setChecks] = useState<DodRequiredCheck[]>([]);
  const [duplicateError, setDuplicateError] = useState<string>("");

  // 設定を取得
  const { data: settings, isLoading } = useSettings(projectId);

  // 設定から dod.requiredChecks を取得
  const currentChecks = useMemo(() => {
    const setting = settings?.find((s: Setting) => s.key === "dod.requiredChecks");
    if (!setting?.value) return [];
    // データベースには常にJSON配列として保存されている
    return Array.isArray(setting.value) ? (setting.value as DodRequiredCheck[]) : [];
  }, [settings]);

  // ローカル状態を初期化（設定が読み込まれたら）
  useEffect(() => {
    if (settings) {
      setChecks(currentChecks);
    }
  }, [settings, currentChecks]);

  // 更新ミューテーション
  const updateMutation = useMutation({
    mutationFn: async (newChecks: DodRequiredCheck[]) => {
      const res = await settingsApi.update(projectId, "dod.requiredChecks", newChecks);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", projectId] });
    },
  });

  // ヘルパー関数: check_keyの重複チェック
  const validateCheckKey = (checkKey: string, excludeKey?: string): string | null => {
    if (checks.some((c) => c.check_key === checkKey && c.check_key !== excludeKey)) {
      return `check_key "${checkKey}" が既に存在します。`;
    }
    return null;
  };

  // ヘルパー関数: タイムアウト値のパース
  const parseTimeout = (timeoutStr: string): number | undefined => {
    const timeout = timeoutStr.trim();
    if (timeout === "" || timeout === "0") return undefined;
    const numValue = Number(timeout);
    return !isNaN(numValue) && numValue > 0 ? numValue : undefined;
  };

  // ヘルパー関数: チェック項目の更新
  const updateCheck = (
    checkKey: string,
    updater: (check: DodRequiredCheck) => DodRequiredCheck
  ) => {
    setChecks(checks.map((c) => (c.check_key === checkKey ? updater(c) : c)));
  };

  // 自動消去: 成功メッセージとエラーメッセージ
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    if (updateMutation.isSuccess) {
      timers.push(setTimeout(() => updateMutation.reset(), 3000));
    }

    if (duplicateError) {
      timers.push(setTimeout(() => setDuplicateError(""), 3000));
    }

    return () => timers.forEach(clearTimeout);
  }, [updateMutation.isSuccess, duplicateError]);

  const handleAdd = () => {
    const trimmedLabel = newLabel.trim();
    const trimmedCommand = newCommand.trim();

    if (trimmedLabel && trimmedCommand) {
      const checkKey = slugify(trimmedLabel);
      const error = validateCheckKey(checkKey);
      if (error) {
        setDuplicateError(
          `同じラベル "${trimmedLabel}" から生成されるcheck_key "${checkKey}" が既に存在します。`
        );
        return;
      }

      const timeoutSec = parseTimeout(newTimeoutSec);

      const newCheck: DodRequiredCheck = {
        check_key: checkKey,
        label: trimmedLabel,
        command: trimmedCommand,
        required: newRequired,
        ...(timeoutSec && { timeout_sec: timeoutSec }),
      };

      setChecks([...checks, newCheck]);
      setNewLabel("");
      setNewCommand("");
      setNewRequired(false);
      setNewTimeoutSec("");
    }
  };

  const handleRemove = (checkKey: string) => {
    setChecks(checks.filter((c) => c.check_key !== checkKey));
  };

  const handleUpdateLabel = (checkKey: string, newLabel: string) => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return;

    const newCheckKey = slugify(trimmedLabel);
    const error = validateCheckKey(newCheckKey, checkKey);
    if (error) {
      setDuplicateError(
        `同じラベル "${trimmedLabel}" から生成されるcheck_key "${newCheckKey}" が既に存在します。`
      );
      return;
    }

    updateCheck(checkKey, (c) => ({ ...c, label: trimmedLabel, check_key: newCheckKey }));
  };

  const handleUpdateCommand = (checkKey: string, newCommand: string) => {
    updateCheck(checkKey, (c) => ({ ...c, command: newCommand.trim() }));
  };

  const handleToggleRequired = (checkKey: string) => {
    updateCheck(checkKey, (c) => ({ ...c, required: !c.required }));
  };

  const handleUpdateTimeout = (checkKey: string, timeoutSec: string) => {
    const parsedTimeout = parseTimeout(timeoutSec);
    updateCheck(checkKey, (c) => {
      if (parsedTimeout === undefined) {
        const { timeout_sec: _timeout_sec, ...rest } = c;
        return rest;
      }
      return { ...c, timeout_sec: parsedTimeout };
    });
  };

  const handleSave = () => {
    // check_keyの重複チェック
    const checkKeys = checks.map((c) => c.check_key);
    const duplicates = checkKeys.filter((key, index) => checkKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      setDuplicateError(`check_key "${duplicates[0]}" が重複しています。`);
      return;
    }

    updateMutation.mutate(checks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
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
      {/* 現在のチェック項目一覧 */}
      {checks.length > 0 ? (
        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.check_key}
              className="flex items-start gap-3 p-3 bg-zinc-700/50 border border-zinc-600 rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={check.label}
                    onChange={(e) => handleUpdateLabel(check.check_key, e.target.value)}
                    className="flex-1 px-2 py-0.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                  <span className="text-xs text-zinc-500 font-mono">({check.check_key})</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={check.required}
                      onChange={() => handleToggleRequired(check.check_key)}
                      className="w-3.5 h-3.5 rounded border-zinc-500 bg-zinc-800 text-blue-600 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-zinc-900"
                    />
                    <span className="text-xs text-zinc-400">必須</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={check.command}
                  onChange={(e) => handleUpdateCommand(check.check_key, e.target.value)}
                  className="w-full px-2 py-0.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-400 font-mono placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 mb-1"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500">タイムアウト:</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={check.timeout_sec ?? ""}
                      onChange={(e) => handleUpdateTimeout(check.check_key, e.target.value)}
                      placeholder="未設定"
                      className="w-20 px-2 py-0.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                    <span className="text-xs text-zinc-500">秒</span>
                  </label>
                </div>
              </div>
              <button
                onClick={() => handleRemove(check.check_key)}
                className="flex-shrink-0 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={`${check.label} を削除`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          チェック項目が設定されていません
        </div>
      )}

      {/* 追加フォーム */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">ラベル</label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例: テスト実行"
            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">コマンド</label>
          <input
            type="text"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例: npm test"
            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 font-mono"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-500 bg-zinc-800 text-blue-600 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-zinc-900"
            />
            <span className="text-xs text-zinc-400">必須フラグ</span>
          </label>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">タイムアウト（任意）</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              value={newTimeoutSec}
              onChange={(e) => setNewTimeoutSec(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例: 300"
              className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
            />
            <span className="text-xs text-zinc-400">秒</span>
          </div>
        </div>
        {duplicateError && (
          <div className="p-2 bg-red-900/20 border border-red-600/40 rounded text-xs text-red-400">
            {duplicateError}
          </div>
        )}
        <button
          onClick={handleAdd}
          disabled={!newLabel.trim() || !newCommand.trim()}
          className="w-full px-3 py-1.5 bg-zinc-700 text-zinc-200 text-sm border border-zinc-600 rounded hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          追加 (Ctrl+Enter)
        </button>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={
            updateMutation.isPending || JSON.stringify(checks) === JSON.stringify(currentChecks)
          }
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
