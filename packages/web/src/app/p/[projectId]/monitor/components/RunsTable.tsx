import { type ExtendedRun } from "../page";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration, formatTime } from "../utils";
import { STATUS_COLORS } from "@/components/design-tokens";

interface RunsTableProps {
  runs: ExtendedRun[];
  selectedRunId: number | null;
  onRunSelect: (run: ExtendedRun) => void;
  timelineData: { minTime: number; maxTime: number; range: number } | null;
}

export function RunsTable({ runs, selectedRunId, onRunSelect, timelineData }: RunsTableProps) {
  return (
    <div className="flex-1 overflow-auto" style={{ background: "#1b1b1b" }}>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#202020" }}>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{ color: "#a0a0a0", borderColor: "#3c3c3c", background: "#202020", width: 90 }}
            >
              ステータス
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{
                color: "#a0a0a0",
                borderColor: "#3c3c3c",
                background: "#202020",
                minWidth: 200,
              }}
            >
              タスク / 実行
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{
                color: "#a0a0a0",
                borderColor: "#3c3c3c",
                background: "#202020",
                width: 100,
              }}
            >
              エージェント
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{ color: "#a0a0a0", borderColor: "#3c3c3c", background: "#202020", width: 70 }}
            >
              開始
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{ color: "#a0a0a0", borderColor: "#3c3c3c", background: "#202020", width: 70 }}
            >
              所要時間
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{ color: "#a0a0a0", borderColor: "#3c3c3c", background: "#202020", width: 70 }}
            >
              完了定義
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b whitespace-nowrap"
              style={{ color: "#a0a0a0", borderColor: "#3c3c3c", background: "#202020", width: 60 }}
            >
              違反
            </th>
            <th
              className="sticky top-0 z-10 text-left px-2.5 py-2 font-medium border-b"
              style={{
                color: "#a0a0a0",
                borderColor: "#3c3c3c",
                background: "#202020",
                width: 200,
              }}
            >
              <div>タイムライン</div>
              {timelineData && (
                <div
                  className="flex justify-between text-[10px] font-normal mt-1"
                  style={{ color: "#666" }}
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                    <span key={i}>
                      {formatTime(
                        new Date(timelineData.minTime + timelineData.range * p).toISOString()
                      )}
                    </span>
                  ))}
                </div>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-2.5 py-4 text-center" style={{ color: "#a0a0a0" }}>
                （選択中の実行なし）
              </td>
            </tr>
          ) : (
            runs.map((run) => {
              const isSelected = selectedRunId === run.id;
              const left = timelineData
                ? ((new Date(run.startedAt).getTime() - timelineData.minTime) /
                    timelineData.range) *
                  100
                : 0;
              const width = timelineData
                ? Math.max(
                    1,
                    (((run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now()) -
                      new Date(run.startedAt).getTime()) /
                      timelineData.range) *
                      100
                  )
                : 0;
              return (
                <tr
                  key={run.id}
                  className={`cursor-pointer ${isSelected ? "" : "hover:bg-white/[0.04]"}`}
                  style={{ background: isSelected ? "rgba(14,99,156,0.22)" : undefined }}
                  onClick={() => onRunSelect(run)}
                >
                  <td
                    className="px-2.5 py-1.5 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <StatusBadge status={run.status} />
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-[#d4d4d4]">
                      タスク #{run.taskId}: {run.taskTitle}
                    </span>
                    <span className="text-[#a0a0a0] ml-1">/ 実行 #{run.id}</span>
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full border border-white/10 bg-white/5 font-mono">
                      {run.agentProfileName}
                    </span>
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)", color: "#a0a0a0" }}
                  >
                    {formatTime(run.startedAt)}
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b font-mono"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <StatusBadge status={run.dodStatus || "pending"} />
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b font-mono text-center"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    {run.scopeViolationCount || 0}
                  </td>
                  <td
                    className="px-2.5 py-1.5 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="relative h-3.5 rounded"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), rgba(255,255,255,0.04)",
                        backgroundSize: "25% 100%",
                      }}
                    >
                      <div
                        className="absolute top-0.5 h-2.5 rounded"
                        style={{
                          background: STATUS_COLORS[run.status] || STATUS_COLORS.pending,
                          border: "1px solid rgba(255,255,255,0.18)",
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
