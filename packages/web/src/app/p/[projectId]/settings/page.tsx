"use client";

import { useParams } from "next/navigation";

export default function SettingsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Default Exclude */}
        <section>
          <h2 className="text-lg font-semibold mb-4">scope.defaultExclude</h2>
          <p className="text-sm text-gray-500 mb-4">
            Project共通でAIから隠すファイル/ディレクトリを指定します。
          </p>
          <div className="p-4 border rounded bg-gray-50">
            <p className="text-gray-500">
              Settings API実装後に編集可能になります。
            </p>
          </div>
        </section>

        {/* DoD Required Checks */}
        <section>
          <h2 className="text-lg font-semibold mb-4">dod.requiredChecks</h2>
          <p className="text-sm text-gray-500 mb-4">
            Runの完了条件となる必須チェックを定義します。
          </p>
          <div className="p-4 border rounded bg-gray-50">
            <p className="text-gray-500">
              Settings API実装後に編集可能になります。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
