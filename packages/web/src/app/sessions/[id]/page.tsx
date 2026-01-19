import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SessionStatus = "running" | "completed" | "failed" | "cancelled";
type LogLevel = "event" | "info" | "warn" | "error";

type SessionError = {
  type: string;
  message: string;
  details?: string;
};

const sessions: Array<{
  id: number;
  taskId: number;
  taskTitle: string;
  status: SessionStatus;
  agent: string;
  model: string;
  startedAt: string;
  duration: string;
  dodResult: string;
  exitCode: string;
  signal: string;
  worktree: string;
  artifacts: string[];
  error: SessionError | null;
  note: string;
}> = [
  {
    id: 118,
    taskId: 42,
    taskTitle: "Add login endpoint",
    status: "running",
    agent: "coder",
    model: "claude-code / opus",
    startedAt: "2025-03-03 14:30:00",
    duration: "12m 12s",
    dodResult: "pending",
    exitCode: "-",
    signal: "-",
    worktree: "task-42-add-login",
    artifacts: ["src/auth/handler.ts", "src/routes/login.ts"],
    error: null,
    note: "Syncing auth handler, waiting on tests.",
  },
  {
    id: 115,
    taskId: 29,
    taskTitle: "Fix auth timeout bug",
    status: "failed",
    agent: "coder",
    model: "claude-code / opus",
    startedAt: "2025-03-02 18:10:00",
    duration: "8m 47s",
    dodResult: "error",
    exitCode: "137",
    signal: "SIGKILL",
    worktree: "task-29-auth-timeout",
    artifacts: ["src/auth/timeout.ts"],
    error: {
      type: "timeout",
      message: "Worker exceeded the 8m execution budget.",
      details: "Retry loop triggered on API fetch.",
    },
    note: "Hit retry loop while refreshing tokens.",
  },
];

const logEntries: Array<{
  time: string;
  level: LogLevel;
  source: string;
  message: string;
}> = [
  {
    time: "14:30:02",
    level: "event",
    source: "orchestrator",
    message: "Session #118 started for task #42.",
  },
  {
    time: "14:30:08",
    level: "info",
    source: "worker",
    message: "Checked out branch task-42-add-login.",
  },
  {
    time: "14:31:11",
    level: "info",
    source: "worker",
    message: "Editing auth handler and route definitions.",
  },
  {
    time: "14:36:22",
    level: "warn",
    source: "worker",
    message: "Tests running longer than expected.",
  },
  {
    time: "14:39:52",
    level: "info",
    source: "git",
    message: "Detected 2 modified files.",
  },
  {
    time: "14:44:05",
    level: "event",
    source: "orchestrator",
    message: "Artifacts recorded, awaiting review.",
  },
];

const statusMeta: Record<
  SessionStatus,
  { label: string; badge: string; dot: string }
> = {
  running: {
    label: "Running",
    badge: "bg-emerald-500/10 text-emerald-700",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    badge: "bg-sky-500/10 text-sky-700",
    dot: "bg-sky-500",
  },
  failed: {
    label: "Failed",
    badge: "bg-rose-500/10 text-rose-700",
    dot: "bg-rose-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-amber-500/10 text-amber-700",
    dot: "bg-amber-500",
  },
};

const logMeta: Record<LogLevel, { label: string; badge: string }> = {
  event: {
    label: "event",
    badge: "bg-slate-500/10 text-slate-700",
  },
  info: {
    label: "info",
    badge: "bg-sky-500/10 text-sky-700",
  },
  warn: {
    label: "warn",
    badge: "bg-amber-500/10 text-amber-700",
  },
  error: {
    label: "error",
    badge: "bg-rose-500/10 text-rose-700",
  },
};

export default function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sessionId = Number(params.id);
  const resolvedSessionId = Number.isFinite(sessionId)
    ? sessionId
    : sessions[0].id;
  const baseSession = sessions[0];
  const session =
    sessions.find((item) => item.id === resolvedSessionId) ?? {
      ...baseSession,
      id: resolvedSessionId,
    };
  const status = statusMeta[session.status];
  const runtimeSignals = [
    { label: "Worker", value: "worker-2 (linux-x64)" },
    { label: "PID", value: session.status === "running" ? "32144" : "-" },
    { label: "Exit code", value: session.exitCode },
    { label: "Signal", value: session.signal },
    { label: "DoD result", value: session.dodResult },
    {
      label: "Artifacts",
      value: `${session.artifacts.length} file${
        session.artifacts.length === 1 ? "" : "s"
      }`,
    },
  ];

  return (
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),transparent_55%),radial-gradient(circle_at_90%_10%,rgba(248,113,113,0.12),transparent_50%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Session
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Session #{session.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              Task #{session.taskId}: {session.taskTitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${status.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className="rounded-full border bg-background/80 px-3 py-1">
                Agent: {session.agent} / {session.model}
              </span>
              <span className="rounded-full border bg-background/80 px-3 py-1">
                Started {session.startedAt}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/sessions">Back to sessions</Link>
            </Button>
            <Button variant="outline" size="sm">
              View task
            </Button>
            <Button variant="destructive" size="sm">
              Cancel session
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Overview
                </p>
                <h2 className="text-lg font-semibold">Session summary</h2>
              </div>
              <span className="rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase">
                {session.status === "running" ? "live" : "closed"}
              </span>
            </div>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Duration
                </p>
                <p className="mt-2 text-lg font-semibold">{session.duration}</p>
                <p className="text-xs text-muted-foreground">
                  Updating while session runs.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Worktree
                </p>
                <p className="mt-2 text-lg font-semibold">{session.worktree}</p>
                <p className="text-xs text-muted-foreground">
                  Base branch main
                </p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  DoD Result
                </p>
                <p className="mt-2 text-lg font-semibold">{session.dodResult}</p>
                <p className="text-xs text-muted-foreground">
                  Awaiting reviewer decision
                </p>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Exit status
                </p>
                <p className="mt-2 text-lg font-semibold">{session.exitCode}</p>
                <p className="text-xs text-muted-foreground">
                  Signal {session.signal}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Current note
              </p>
              <p className="mt-2 text-sm font-medium">{session.note}</p>
            </div>
          </section>

          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Artifacts
                </p>
                <h2 className="text-lg font-semibold">Changed files</h2>
              </div>
              <Button size="sm" variant="outline">
                View diff
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {session.artifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No files captured yet.
                </p>
              ) : (
                session.artifacts.map((artifact) => (
                  <div
                    key={artifact}
                    className="rounded-2xl border bg-background/80 px-3 py-2 font-mono text-xs"
                  >
                    {artifact}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Errors
                </p>
                <h2 className="text-lg font-semibold">Failure details</h2>
              </div>
              <span className="rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase">
                {session.error ? "error" : "none"}
              </span>
            </div>
            <div className="mt-4 rounded-2xl border bg-background/80 p-4 text-sm">
              {session.error ? (
                <div className="space-y-2">
                  <p className="font-semibold">{session.error.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.error.message}
                  </p>
                  {session.error.details ? (
                    <p className="text-xs text-muted-foreground">
                      Details: {session.error.details}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No error recorded for this session.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Log stream
                </p>
                <h2 className="text-lg font-semibold">Session log</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline">
                  Live tail
                </Button>
                <Button size="sm" variant="outline">
                  Export
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <Input placeholder="Filter by keyword" className="md:max-w-xs" />
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.values(logMeta).map((meta) => (
                  <span
                    key={meta.label}
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 h-[420px] overflow-auto rounded-2xl border bg-background/80 p-4 font-mono text-xs">
              <div className="space-y-2">
                {logEntries.map((entry, index) => (
                  <div
                    key={`${entry.time}-${index}`}
                    className="grid grid-cols-[70px_60px_90px_minmax(0,1fr)] gap-3"
                  >
                    <span className="text-muted-foreground">{entry.time}</span>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${logMeta[entry.level].badge}`}
                    >
                      {logMeta[entry.level].label}
                    </span>
                    <span className="text-muted-foreground">{entry.source}</span>
                    <span className="text-foreground/90">
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Signals
              </p>
              <h2 className="text-lg font-semibold">Runtime telemetry</h2>
              <p className="text-sm text-muted-foreground">
                Signals reported by the orchestrator while the session runs.
              </p>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {runtimeSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border bg-background/80 p-3"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {signal.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{signal.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
