"use client";

import { useRef, useEffect } from "react";
import type { OutputLine } from "@/lib/store";

export function parseStreamJsonLine(
  raw: string
): { label: string; text: string; color: string } | null {
  try {
    const obj = JSON.parse(raw);
    if (obj.type === "assistant" && obj.message?.content) {
      const texts = obj.message.content
        .filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text);
      if (texts.length > 0) return { label: "assistant", text: texts.join(""), color: "#c9d1d9" };
    }
    if (obj.type === "content_block_delta" && obj.delta?.text) {
      return { label: "text", text: obj.delta.text, color: "#c9d1d9" };
    }
    if (obj.type === "content_block_start" && obj.content_block?.type === "tool_use") {
      return {
        label: "tool",
        text: `${obj.content_block.name}(...)`,
        color: "#d2a8ff",
      };
    }
    if (obj.type === "tool_result" || (obj.type === "result" && obj.subtype === "success")) {
      const preview =
        typeof obj.result === "string"
          ? obj.result.slice(0, 200)
          : JSON.stringify(obj).slice(0, 200);
      return { label: "result", text: preview, color: "#7ee787" };
    }
    if (obj.type === "system" || obj.type === "init") {
      return {
        label: "system",
        text: JSON.stringify(obj).slice(0, 150),
        color: "#58a6ff",
      };
    }
    if (obj.type) {
      return {
        label: obj.type,
        text: JSON.stringify(obj).slice(0, 200),
        color: "#8b949e",
      };
    }
  } catch {
    // not JSON
  }
  return null;
}

const formatTs = (ts: string) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

/**
 * TerminalOutput - ストリーム出力のターミナル表示コンポーネント
 *
 * terminalRef を渡すと外部から ref を注入（monitor 用）。
 * 渡さない場合は内部で自動スクロールする ref を生成（live 用）。
 */
export function TerminalOutput({
  lines,
  isRunning,
  maxHeight,
  terminalRef: externalRef,
}: {
  lines: OutputLine[];
  isRunning: boolean;
  maxHeight?: number;
  terminalRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    if (!externalRef && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines.length, externalRef, ref]);

  if (lines.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "#484f58", minHeight: 80 }}
      >
        {isRunning ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            出力を待機中...
          </span>
        ) : (
          <span className="text-xs">出力なし</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {isRunning && (
        <div
          className="flex items-center gap-2 px-2.5 py-1 text-[11px] border-b"
          style={{ color: "#cca700", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          実行中...
        </div>
      )}
      <div
        ref={ref}
        className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-[1.6]"
        style={{ background: "#0d1117", maxHeight: maxHeight ?? undefined }}
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
          const raw = line.data ?? "";
          const jsonLines = raw.split("\n").filter((l) => l.trim());
          const elements: React.ReactNode[] = [];
          for (const jsonLine of jsonLines) {
            const parsed = parseStreamJsonLine(jsonLine);
            if (parsed) {
              elements.push(
                <div key={`${i}-${elements.length}`} className="py-0.5 flex gap-1.5">
                  <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span>
                  <span
                    className="px-1 rounded text-[10px]"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: parsed.color,
                    }}
                  >
                    {parsed.label}
                  </span>
                  <span style={{ color: parsed.color, wordBreak: "break-all" }}>{parsed.text}</span>
                </div>
              );
            } else if (jsonLine.trim()) {
              elements.push(
                <div
                  key={`${i}-${elements.length}`}
                  className="py-0.5"
                  style={{ color: "#c9d1d9" }}
                >
                  <span style={{ color: "#484f58" }}>[{formatTs(line.timestamp)}]</span> {jsonLine}
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
