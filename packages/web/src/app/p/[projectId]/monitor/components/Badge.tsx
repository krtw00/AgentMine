interface BadgeProps {
  status: string;
  type?: "status" | "dod";
}

export function Badge({ status, type = "status" }: BadgeProps) {
  const colorClass = status === "running" || status === "pending" ? "text-[#cca700]"
    : status === "completed" || status === "passed" ? "text-[#89d185]"
    : status === "failed" ? "text-[#f14c4c]"
    : "text-[#a0a0a0]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border border-white/10 ${colorClass}`}>
      {status}
    </span>
  );
}

