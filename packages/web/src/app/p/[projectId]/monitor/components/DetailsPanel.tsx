import { type ExtendedRun } from "../page";
import { type OutputLine } from "@/lib/store";
import { TerminalOutput } from "@/components/TerminalOutput";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration } from "../utils";

interface DetailsPanelProps {
  run: ExtendedRun;
  lines: OutputLine[];
  isRunning: boolean;
  activeTab: "output" | "meta" | "timing" | "checks" | "violations" | "git";
  onTabChange: (tab: "output" | "meta" | "timing" | "checks" | "violations" | "git") => void;
  onClose: () => void;
  terminalRef: React.RefObject<HTMLDivElement | null>;
}

const tabs = [
  { id: "output" as const, label: "出力" },
  { id: "meta" as const, label: "メタ" },
  { id: "timing" as const, label: "タイミング" },
  { id: "checks" as const, label: "チェック" },
  { id: "violations" as const, label: "違反" },
  { id: "git" as const, label: "Git/Worktree" },
];

export function DetailsPanel({
  run,
  lines,
  isRunning,
  activeTab,
  onTabChange,
  onClose,
  terminalRef,
}: DetailsPanelProps) {
  return (
    <div className="flex flex-col" style={{ width: 520, minWidth: 420 }}>
      {/* Details Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ background: "#252526", borderColor: "#3c3c3c" }}
      >
        <h2 className="text-[13px] font-semibold m-0">詳細</h2>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border"
          style={{ background: "#2d2d2d", borderColor: "#3c3c3c" }}
        >
          <span className="text-[#a0a0a0]">選択中</span>
          <strong className="text-[#d4d4d4] font-semibold">実行 #{run.id}</strong>
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border font-mono"
          style={{ background: "#2d2d2d", borderColor: "#3c3c3c" }}
        >
          <span className="text-[#a0a0a0]">head_sha</span>
          <strong className="text-[#d4d4d4]">{run.headSha?.slice(0, 7) || "-"}</strong>
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-2 py-1 text-xs rounded border cursor-pointer"
          style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
        >
          隠す
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-2 px-2.5 py-2 border-b"
        style={{ background: "#252526", borderColor: "#3c3c3c" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2.5 py-1.5 text-xs rounded cursor-pointer ${activeTab === tab.id ? "bg-white/5 text-[#d4d4d4]" : "text-[#a0a0a0]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto p-2.5" style={{ background: "#1b1b1b" }}>
        {activeTab === "output" && (
          <TerminalOutput lines={lines} isRunning={isRunning} terminalRef={terminalRef} />
        )}
        {activeTab === "meta" && (
          <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="text-[#a0a0a0]">タスクID</div>
            <div className="font-mono">{run.taskId}</div>
            <div className="text-[#a0a0a0]">実行ID</div>
            <div className="font-mono">{run.id}</div>
            <div className="text-[#a0a0a0]">プロファイル</div>
            <div>{run.agentProfileName}</div>
            <div className="text-[#a0a0a0]">ステータス</div>
            <div>
              <StatusBadge status={run.status} />
            </div>
          </div>
        )}
        {activeTab === "timing" && (
          <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="text-[#a0a0a0]">スコープ適用</div>
            <div className="font-mono text-[#a0a0a0]">未実装</div>
            <div className="text-[#a0a0a0]">ランナー実行</div>
            <div className="font-mono">{formatDuration(run.startedAt, run.finishedAt)}</div>
            <div className="text-[#a0a0a0]">後処理チェック</div>
            <div className="font-mono text-[#a0a0a0]">未実装</div>
            <div className="text-[#a0a0a0]">完了定義チェック</div>
            <div className="font-mono text-[#a0a0a0]">未実装</div>
          </div>
        )}
        {activeTab === "checks" && (
          <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="text-[#a0a0a0]">完了定義</div>
            <div>
              <StatusBadge status={run.dodStatus || "pending"} />
            </div>
            <div className="text-[#a0a0a0]">チェック項目</div>
            <div className="font-mono">lint: pending / test: pending</div>
          </div>
        )}
        {activeTab === "violations" && (
          <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="text-[#a0a0a0]">件数</div>
            <div className="font-mono">{run.scopeViolationCount || 0}</div>
            <div className="text-[#a0a0a0]">操作</div>
            <div className="flex gap-2">
              <button
                disabled
                className="px-2 py-1 text-xs rounded border cursor-not-allowed opacity-50"
                style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#a0a0a0" }}
                title="未実装"
              >
                承認
              </button>
              <button
                disabled
                className="px-2 py-1 text-xs rounded border cursor-not-allowed opacity-50"
                style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#a0a0a0" }}
                title="未実装"
              >
                却下
              </button>
            </div>
          </div>
        )}
        {activeTab === "git" && (
          <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="text-[#a0a0a0]">ヘッドSHA</div>
            <div className="font-mono">{run.headSha || "-"}</div>
            <div className="text-[#a0a0a0]">未コミット変更</div>
            <div className="font-mono">
              {run.worktreeDirty === null ? "不明" : run.worktreeDirty ? "あり" : "なし"}
            </div>
            <div className="text-[#a0a0a0]">ブランチ</div>
            <div className="font-mono">{run.branchName}</div>
            <div className="text-[#a0a0a0]">ワークツリーパス</div>
            <div className="font-mono break-all">{run.worktreePath}</div>
          </div>
        )}
      </div>
    </div>
  );
}
