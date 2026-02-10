interface FilterBarProps {
  statusFilters: Set<string>;
  setStatusFilters: (filters: Set<string>) => void;
  reasonCodeFilters: Set<string>;
  setReasonCodeFilters: (filters: Set<string>) => void;
  taskFilter: string;
  setTaskFilter: (filter: string) => void;
  agentProfileFilters: Set<string>;
  setAgentProfileFilters: (filters: Set<string>) => void;
  profiles: { id: number; name: string }[];
}

export function FilterBar({
  statusFilters,
  setStatusFilters,
  reasonCodeFilters,
  setReasonCodeFilters,
  taskFilter,
  setTaskFilter,
  agentProfileFilters,
  setAgentProfileFilters,
  profiles,
}: FilterBarProps) {
  const statusOptions = ["running", "completed", "failed", "cancelled"];
  const reasonCodeOptions = [
    "dod_failed",
    "dod_pending",
    "scope_violation_pending",
    "scope_violation_rejected",
    "blocked_by_dependencies",
    "run_failed",
  ];

  const toggleStatus = (status: string) => {
    const next = new Set(statusFilters);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setStatusFilters(next);
  };

  const toggleReasonCode = (code: string) => {
    const next = new Set(reasonCodeFilters);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setReasonCodeFilters(next);
  };

  const toggleAgentProfile = (name: string) => {
    const next = new Set(agentProfileFilters);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setAgentProfileFilters(next);
  };

  return (
    <div className="px-3 py-2 border-b flex items-center gap-3 flex-wrap" style={{ background: "#252526", borderColor: "#3c3c3c" }}>
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#a0a0a0]">ステータス:</span>
        <div className="flex gap-1.5">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${
                statusFilters.has(status)
                  ? "bg-[#0e639c] border-[#0e639c] text-white"
                  : "bg-[#2d2d2d] border-[#3c3c3c] text-[#d4d4d4]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Reason Codes Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#a0a0a0]">理由:</span>
        <div className="flex gap-1.5 flex-wrap">
          {reasonCodeOptions.map((code) => (
            <button
              key={code}
              onClick={() => toggleReasonCode(code)}
              className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${
                reasonCodeFilters.has(code)
                  ? "bg-[#0e639c] border-[#0e639c] text-white"
                  : "bg-[#2d2d2d] border-[#3c3c3c] text-[#d4d4d4]"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Task Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#a0a0a0]">タスク:</span>
        <input
          type="text"
          placeholder="ID または タイトル検索"
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
          className="px-2 py-1 text-[11px] rounded border outline-none min-w-[150px]"
          style={{ background: "#1b1b1b", borderColor: "#3c3c3c", color: "#d4d4d4" }}
        />
      </div>

      {/* Agent Profile Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#a0a0a0]">プロファイル:</span>
        <div className="flex gap-1.5 flex-wrap">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => toggleAgentProfile(profile.name)}
              className={`px-2 py-1 text-[11px] rounded border cursor-pointer ${
                agentProfileFilters.has(profile.name)
                  ? "bg-[#0e639c] border-[#0e639c] text-white"
                  : "bg-[#2d2d2d] border-[#3c3c3c] text-[#d4d4d4]"
              }`}
            >
              {profile.name}
            </button>
          ))}
        </div>
      </div>

      {/* Clear All */}
      {(statusFilters.size > 0 || reasonCodeFilters.size > 0 || taskFilter || agentProfileFilters.size > 0) && (
        <button
          onClick={() => {
            setStatusFilters(new Set());
            setReasonCodeFilters(new Set());
            setTaskFilter("");
            setAgentProfileFilters(new Set());
          }}
          className="px-2 py-1 text-[11px] rounded border cursor-pointer bg-[#2d2d2d] border-[#3c3c3c] text-[#d4d4d4]"
        >
          クリア
        </button>
      )}
    </div>
  );
}

