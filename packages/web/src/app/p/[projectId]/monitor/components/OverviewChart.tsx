import { formatTime } from "../utils";

interface OverviewChartProps {
  overview: {
    time_range: { start: string; end: string };
    activity: Array<{ time: string; count: number }>;
  };
}

export function OverviewChart({ overview }: OverviewChartProps) {
  return (
    <div className="mx-3 mt-2 rounded-lg overflow-hidden border" style={{ background: "#111", borderColor: "#3c3c3c" }}>
      <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] border-b" style={{ color: "#a0a0a0", borderColor: "rgba(255,255,255,0.06)" }}>
        <span>概要（アクティビティ - 過去24時間）</span>
        <span className="font-mono">
          {formatTime(overview.time_range.start)} - {formatTime(overview.time_range.end)}
        </span>
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-end gap-1 h-16">
          {overview.activity.map((act, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                background: act.count > 0 ? "rgba(14, 99, 156, 0.6)" : "rgba(255,255,255,0.06)",
                height: `${Math.max(4, (act.count / Math.max(...overview.activity.map(a => a.count), 1)) * 100)}%`,
                minHeight: "4px",
              }}
              title={`${formatTime(act.time)}: ${act.count} runs`}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between px-2.5 py-1 text-[10px]" style={{ color: "#a0a0a0" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const time = new Date(
            new Date(overview.time_range.start).getTime() +
            (new Date(overview.time_range.end).getTime() - new Date(overview.time_range.start).getTime()) * p
          );
          return <span key={i}>{formatTime(time.toISOString())}</span>;
        })}
      </div>
    </div>
  );
}

