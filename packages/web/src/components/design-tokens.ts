/**
 * ステータスに対応するカラー定義
 * live/monitor/runs 各ページで共有
 */
export const STATUS_COLORS: Record<string, string> = {
  running: "#cca700",
  completed: "#89d185",
  failed: "#f14c4c",
  cancelled: "#71717a",
  ready: "#0e639c",
  pending: "#71717a",
  blocked: "#f97316",
  passed: "#89d185",
  approved: "#89d185",
  rejected: "#f14c4c",
  needs_review: "#cca700",
};

/**
 * Tailwind CSS クラスベースのステータススタイル
 * runs/page.tsx, runs/[runId]/page.tsx で使用
 */
export const STATUS_STYLES: Record<string, string> = {
  running: "bg-blue-600/20 text-blue-400 border border-blue-600/40",
  completed: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
  failed: "bg-red-600/20 text-red-400 border border-red-600/40",
  cancelled: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
  passed: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
  pending: "bg-zinc-600/30 text-zinc-400 border border-zinc-600",
  approved: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
  rejected: "bg-red-600/20 text-red-400 border border-red-600/40",
};
