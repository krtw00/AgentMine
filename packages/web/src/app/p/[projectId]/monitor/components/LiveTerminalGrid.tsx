import { useMemo } from "react";
import { type OutputLine } from "@/lib/store";
import { LiveTerminalPane } from "./LiveTerminalPane";
import { formatDuration } from "../utils";

type ExtendedRun = {
  id: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  taskTitle: string;
  agentProfileName?: string;
};

interface LiveTerminalGridProps {
  runs: ExtendedRun[];
  runOutputs: Map<number, OutputLine[]>;
}

export function LiveTerminalGrid({ runs, runOutputs }: LiveTerminalGridProps) {
  // 実行中 + 最近出力があったRunを表示
  const liveRuns = useMemo(() => {
    const running = runs.filter((r) => r.status === "running");
    // 実行中がなければ、出力バッファがあるRunのうち最新のものを表示
    if (running.length === 0) {
      const withOutput = runs
        .filter((r) => runOutputs.has(r.id) && (runOutputs.get(r.id)?.length ?? 0) > 0)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 4);
      return withOutput;
    }
    return running;
  }, [runs, runOutputs]);

  if (liveRuns.length === 0) return null;

  const gridCols = liveRuns.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="mx-3 mt-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-semibold" style={{ color: "#d4d4d4" }}>
          ライブ実行
        </span>
        {liveRuns.some((r) => r.status === "running") && (
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#cca700" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            {liveRuns.filter((r) => r.status === "running").length} 件実行中
          </span>
        )}
      </div>
      <div className={`grid ${gridCols} gap-2`} style={{ maxHeight: 320 }}>
        {liveRuns.map((run) => (
          <LiveTerminalPane
            key={run.id}
            run={run}
            lines={runOutputs.get(run.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

