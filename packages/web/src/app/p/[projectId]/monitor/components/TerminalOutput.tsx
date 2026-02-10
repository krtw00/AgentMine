import { type OutputLine } from "@/lib/store";
import { parseStreamJsonLine } from "../utils";

interface TerminalOutputProps {
  lines: OutputLine[];
  isRunning: boolean;
  terminalRef: React.RefObject<HTMLDivElement | null>;
}

export function TerminalOutput({ lines, isRunning, terminalRef }: TerminalOutputProps) {
  const formatTs = (ts: string) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "#484f58", minHeight: 120 }}>
        <div className="text-xs">
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              出力を待機中...
            </span>
          ) : (
            "出力なし"
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {isRunning && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] border-b" style={{ color: "#cca700", borderColor: "rgba(255,255,255,0.06)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          実行中...
        </div>
      )}
      <div
        ref={terminalRef}
        className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-[1.6]"
        style={{ background: "#0d1117" }}
      >
        {lines.map((line, i) => {
          if (line.type === "system") {
            return (
              <div key={i} className="py-0.5" style={{ color: "#58a6ff" }}>
                <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span>{" "}
                <span style={{ color: "#388bfd" }}>---</span> {line.data}
              </div>
            );
          }
          if (line.type === "stderr") {
            return (
              <div key={i} className="py-0.5" style={{ color: "#f85149" }}>
                <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span>{" "}
                <span style={{ color: "#da3633" }}>ERR</span> {line.data}
              </div>
            );
          }
          if (line.type === "exit") {
            const color = line.exitCode === 0 ? "#7ee787" : "#f85149";
            return (
              <div key={i} className="py-0.5" style={{ color }}>
                <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span>{" "}
                <span style={{ color }}>EXIT</span> code={line.exitCode}
              </div>
            );
          }
          // stdout: stream-jsonパース試行
          const raw = line.data ?? "";
          const jsonLines = raw.split("\n").filter((l) => l.trim());
          const elements: React.ReactNode[] = [];
          for (const jsonLine of jsonLines) {
            const parsed = parseStreamJsonLine(jsonLine);
            if (parsed) {
              elements.push(
                <div key={`${i}-${elements.length}`} className="py-0.5 flex gap-1.5">
                  <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span>
                  <span className="px-1 rounded text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: parsed.color }}>
                    {parsed.label}
                  </span>
                  <span style={{ color: parsed.color, wordBreak: "break-all" }}>{parsed.text}</span>
                </div>
              );
            } else if (jsonLine.trim()) {
              elements.push(
                <div key={`${i}-${elements.length}`} className="py-0.5" style={{ color: "#c9d1d9" }}>
                  <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span>{" "}
                  {jsonLine}
                </div>
              );
            }
          }
          return elements.length > 0 ? <div key={i}>{elements}</div> : null;
        })}
      </div>
    </div>
  );
}

