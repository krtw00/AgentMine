import { STATUS_COLORS, STATUS_STYLES } from "./design-tokens";

/**
 * variant="pill" (default): inline-style ベースの rounded-full バッジ (live/monitor 系)
 * variant="tag": Tailwind クラスベースの rounded バッジ (runs 系)
 */
export function StatusBadge({
  status,
  variant = "pill",
}: {
  status: string;
  variant?: "pill" | "tag";
}) {
  if (variant === "tag") {
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}
      >
        {status}
      </span>
    );
  }

  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-full border"
      style={{ color, borderColor: `${color}44` }}
    >
      {status === "running" && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      )}
      {status}
    </span>
  );
}
