"use client";

import { useParams } from "next/navigation";

export default function SettingsPage() {
  const params = useParams();
  const _projectId = Number(params.projectId); // TODO: Settings API連携時に使用

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center border-b border-zinc-700 bg-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-100">プロジェクト設定</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Default Exclude */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-zinc-100 mb-2">
            除外パターン (scope.defaultExclude)
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            プロジェクト共通でAIから隠すファイル/ディレクトリを指定します。
          </p>
          <div className="p-3 bg-zinc-700/50 border border-zinc-600 rounded text-sm text-zinc-400">
            Settings API実装後に編集可能になります。
          </div>
        </section>

        {/* DoD Required Checks */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-zinc-100 mb-2">
            完了定義チェック (dod.requiredChecks)
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Runの完了条件となる必須チェックを定義します。
          </p>
          <div className="p-3 bg-zinc-700/50 border border-zinc-600 rounded text-sm text-zinc-400">
            Settings API実装後に編集可能になります。
          </div>
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
