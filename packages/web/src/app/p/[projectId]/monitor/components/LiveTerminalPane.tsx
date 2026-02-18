import { useRef, useEffect } from "react";
import { type OutputLine } from "@/lib/store";
import { formatDuration } from "../utils";
import { parseStreamJsonLine } from "@/components/TerminalOutput";

type ExtendedRun = {
  id: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  taskTitle: string;
  agentProfileName?: string;
};

interface LiveTerminalPaneProps {
  run: ExtendedRun;
  lines: OutputLine[];
}

export function LiveTerminalPane({ run, lines }: LiveTerminalPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const isRunning = run.status === "running";

  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.scrollTop = paneRef.current.scrollHeight;
    }
  }, [lines.length]);

  const statusColor = isRunning
    ? "#cca700"
    : run.status === "completed"
      ? "#89d185"
      : run.status === "failed"
        ? "#f14c4c"
        : "#a0a0a0";

  return (
    <div
      className="rounded-lg border overflow-hidden flex flex-col"
      style={{ background: "#0d1117", borderColor: "#30363d", maxHeight: 320 }}
    >
      {/* ペインヘッダー */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 border-b"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: statusColor,
            boxShadow: isRunning ? `0 0 6px ${statusColor}` : "none",
          }}
        />
        <span className="text-[11px] font-semibold" style={{ color: "#c9d1d9" }}>
          実行 #{run.id}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border"
          style={{ color: "#8b949e", background: "#21262d", borderColor: "#30363d" }}
        >
          {run.taskTitle}
        </span>
        <span className="text-[10px] font-mono ml-auto" style={{ color: "#8b949e" }}>
          {run.agentProfileName}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "#8b949e" }}>
          {formatDuration(run.startedAt, run.finishedAt)}
        </span>
      </div>
      {/* ターミナル本体 */}
      <div
        ref={paneRef}
        className="flex-1 overflow-auto px-2 py-1.5 font-mono text-[10px] leading-[1.5]"
        style={{ minHeight: 80 }}
      >
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: "#484f58" }}>
            {isRunning ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                出力を待機中...
              </span>
            ) : (
              "出力なし"
            )}
          </div>
        ) : (
          lines.slice(-100).map((line, i) => {
            if (line.type === "system") {
              return (
                <div key={i} style={{ color: "#58a6ff" }}>
                  --- {line.data}
                </div>
              );
            }
            if (line.type === "stderr") {
              return (
                <div key={i} style={{ color: "#f85149" }}>
                  {line.data}
                </div>
              );
            }
            if (line.type === "exit") {
              const c = line.exitCode === 0 ? "#7ee787" : "#f85149";
              return (
                <div key={i} style={{ color: c }}>
                  EXIT code={line.exitCode}
                </div>
              );
            }
            // stdout: stream-jsonパース
            const raw = line.data ?? "";
            const jsonLines = raw.split("\n").filter((l) => l.trim());
            return (
              <div key={i}>
                {jsonLines.map((jl, j) => {
                  const parsed = parseStreamJsonLine(jl);
                  if (parsed) {
                    return (
                      <div key={j} className="flex gap-1">
                        <span className="shrink-0" style={{ color: parsed.color, opacity: 0.6 }}>
                          {parsed.label}
                        </span>
                        <span style={{ color: parsed.color, wordBreak: "break-all" }}>
                          {parsed.text.slice(0, 300)}
                        </span>
                      </div>
                    );
                  }
                  return jl.trim() ? (
                    <div key={j} style={{ color: "#c9d1d9" }}>
                      {jl.slice(0, 300)}
                    </div>
                  ) : null;
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
