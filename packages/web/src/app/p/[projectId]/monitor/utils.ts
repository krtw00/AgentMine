// stream-json行をパースして表示用に変換
export function parseStreamJsonLine(raw: string): { label: string; text: string; color: string } | null {
  try {
    const obj = JSON.parse(raw);
    // アシスタントテキスト
    if (obj.type === "assistant" && obj.message?.content) {
      const texts = obj.message.content
        .filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text);
      if (texts.length > 0) return { label: "assistant", text: texts.join(""), color: "#c9d1d9" };
    }
    // テキストデルタ
    if (obj.type === "content_block_delta" && obj.delta?.text) {
      return { label: "text", text: obj.delta.text, color: "#c9d1d9" };
    }
    // ツール使用
    if (obj.type === "content_block_start" && obj.content_block?.type === "tool_use") {
      return { label: "tool", text: `${obj.content_block.name}(...)`, color: "#d2a8ff" };
    }
    // ツール結果
    if (obj.type === "tool_result" || (obj.type === "result" && obj.subtype === "success")) {
      const preview = typeof obj.result === "string" ? obj.result.slice(0, 200) : JSON.stringify(obj).slice(0, 200);
      return { label: "result", text: preview, color: "#7ee787" };
    }
    // initイベント
    if (obj.type === "system" || obj.type === "init") {
      return { label: "system", text: JSON.stringify(obj).slice(0, 150), color: "#58a6ff" };
    }
    // その他のイベント（type表示）
    if (obj.type) {
      return { label: obj.type, text: JSON.stringify(obj).slice(0, 200), color: "#8b949e" };
    }
  } catch {
    // JSONでなければそのまま
  }
  return null;
}

export const formatDuration = (startedAt: string, finishedAt?: string | null) => {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
};

export const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const STATUS_COLORS: Record<string, string> = {
  running: "rgba(204, 167, 0, 0.9)",
  completed: "rgba(137, 209, 133, 0.75)",
  failed: "rgba(241, 76, 76, 0.85)",
  cancelled: "rgba(113, 113, 122, 0.7)",
  needs_review: "rgba(204, 167, 0, 0.9)",
  ready: "rgba(14, 99, 156, 0.7)",
  pending: "rgba(113, 113, 122, 0.7)",
};

