import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SessionStatus = "running" | "completed" | "failed" | "cancelled";
type RecentStatus = Exclude<SessionStatus, "running">;

const filters = [
  { id: "all", label: "All", count: 18 },
  { id: "running", label: "Running", count: 2 },
  { id: "completed", label: "Completed", count: 12 },
  { id: "failed", label: "Failed", count: 3 },
  { id: "cancelled", label: "Cancelled", count: 1 },
];

const sessionStats = [
  {
    label: "Live sessions",
    value: "2",
    detail: "1 waiting review",
    className: "from-emerald-200/70 via-emerald-50/70 to-transparent",
  },
  {
    label: "Completed today",
    value: "6",
    detail: "Median 9m 12s",
    className: "from-sky-200/70 via-sky-50/70 to-transparent",
  },
  {
    label: "Failed this week",
    value: "1",
    detail: "Last error 2d ago",
    className: "from-rose-200/70 via-rose-50/70 to-transparent",
  },
  {
    label: "Artifacts tracked",
    value: "23",
    detail: "Across 4 tasks",
    className: "from-amber-200/70 via-amber-50/70 to-transparent",
  },
];

const runningSessions = [
  {
    id: 118,
    taskId: 42,
    taskTitle: "Add login endpoint",
    agent: "coder",
    model: "claude-code / opus",
    startedAt: "Today 14:30",
    duration: "12m 12s",
    worktree: "task-42-add-login",
    activity: "Syncing auth handler",
    progress: 72,
  },
  {
    id: 117,
    taskId: 37,
    taskTitle: "Refactor billing sync",
    agent: "reviewer",
    model: "claude-code / sonnet",
    startedAt: "Today 14:22",
    duration: "5m 08s",
    worktree: "task-37-billing-sync",
    activity: "Running targeted tests",
    progress: 46,
  },
];

const recentSessions: Array<{
  id: number;
  taskId: number;
  taskTitle: string;
  agent: string;
  duration: string;
  completedAt: string;
  status: RecentStatus;
  outcome: string;
  artifacts: number;
  summary: string;
}> = [
  {
    id: 116,
    taskId: 33,
    taskTitle: "Setup database schema",
    agent: "coder",
    duration: "12m 04s",
    completedAt: "Today 12:10",
    status: "completed",
    outcome: "merged",
    artifacts: 3,
    summary: "Schema migration + repository hooks",
  },
  {
    id: 115,
    taskId: 29,
    taskTitle: "Fix auth timeout bug",
    agent: "coder",
    duration: "8m 47s",
    completedAt: "Yesterday 18:24",
    status: "failed",
    outcome: "timeout",
    artifacts: 1,
    summary: "API retry loop hit time limit",
  },
  {
    id: 114,
    taskId: 27,
    taskTitle: "Prepare release notes",
    agent: "planner",
    duration: "4m 12s",
    completedAt: "Yesterday 17:02",
    status: "cancelled",
    outcome: "manual stop",
    artifacts: 0,
    summary: "Scope changed mid-run",
  },
];

const activityFeed = [
  {
    time: "14:44",
    label: "Artifacts captured",
    detail: "Session #118 added 2 files",
  },
  {
    time: "14:39",
    label: "Session paused",
    detail: "Session #117 awaiting approval",
  },
  {
    time: "12:10",
    label: "Session completed",
    detail: "Session #116 merged to main",
  },
  {
    time: "11:55",
    label: "Worker spawned",
    detail: "Session #118 running on worker-2",
  },
];

const reviewQueue = [
  {
    id: 118,
    taskTitle: "Add login endpoint",
    agent: "coder",
    eta: "3m remaining",
  },
  {
    id: 112,
    taskTitle: "Upgrade telemetry",
    agent: "reviewer",
    eta: "awaiting triage",
  },
];

const statusMeta: Record<
  RecentStatus,
  { label: string; badge: string; dot: string }
> = {
  completed: {
    label: "Completed",
    badge: "bg-emerald-500/10 text-emerald-700",
    dot: "bg-emerald-500",
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

export default function SessionsPage() {
  const activeFilterId = "all";

  return (
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Sessions
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Session control room
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Track every agent run, spot bottlenecks fast, and drill into the
            session logs when something looks off.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background/80 px-3 py-1">
              18 total sessions
            </span>
            <span className="rounded-full border bg-background/80 px-3 py-1">
              2 running
            </span>
            <span className="rounded-full border bg-background/80 px-3 py-1 font-mono">
              .agentmine/sessions
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Start Session</Button>
          <Button variant="outline" size="sm">
            Pending Review
          </Button>
          <Button variant="ghost" size="sm">
            Export Log
          </Button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),transparent_55%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.18),transparent_50%)]" />
        <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {sessionStats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border bg-gradient-to-br ${stat.className} p-4 shadow-sm`}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card/60 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search by task, agent, or session id"
              className="md:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = filter.id === activeFilterId;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      isActive
                        ? "border-foreground/30 bg-foreground/10 text-foreground"
                        : "border-transparent bg-background/80 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {filter.label} <span className="ml-1">({filter.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline">
              Filter
            </Button>
            <Button size="sm" variant="outline">
              Sort by recency
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Running
                </p>
                <h2 className="text-xl font-semibold">Live sessions</h2>
              </div>
              <span className="rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold uppercase">
                {runningSessions.length} active
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {runningSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border bg-background/80 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        <p className="text-sm font-semibold">
                          Task #{session.taskId}: {session.taskTitle}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Agent: {session.agent} / {session.model}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/sessions/${session.id}`}>View</Link>
                      </Button>
                      <Button variant="destructive" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="uppercase tracking-[0.2em]">Started</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {session.startedAt}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.2em]">Duration</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {session.duration}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.2em]">Worktree</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {session.worktree}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Current activity
                      </span>
                      <span className="font-medium text-foreground">
                        {session.activity}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${session.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Recent
                </p>
                <h2 className="text-xl font-semibold">Completed sessions</h2>
              </div>
              <span className="rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold uppercase">
                Last 48h
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {recentSessions.map((session) => {
                const meta = statusMeta[session.status];
                return (
                  <div
                    key={session.id}
                    className="rounded-2xl border bg-background/80 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-2 w-2 rounded-full ${meta.dot}`}
                          />
                          <p className="text-sm font-semibold">
                            Task #{session.taskId}: {session.taskTitle}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Agent: {session.agent} / {session.duration} /{" "}
                          {session.completedAt}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                      <div>
                        <p className="uppercase tracking-[0.2em]">Outcome</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {session.outcome}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em]">Artifacts</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {session.artifacts} files
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em]">Summary</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {session.summary}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/sessions/${session.id}`}>View</Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        Delete
                      </Button>
                      {session.status === "failed" ? (
                        <Button size="sm">Retry</Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Activity
                </p>
                <h3 className="text-lg font-semibold">Latest events</h3>
              </div>
              <Button size="sm" variant="outline">
                View feed
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {activityFeed.map((event) => (
                <div
                  key={`${event.time}-${event.label}`}
                  className="rounded-2xl border bg-background/80 p-3 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{event.time}</span>
                    <span className="rounded-full border bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      event
                    </span>
                  </div>
                  <p className="mt-2 font-semibold">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Review queue
                </p>
                <h3 className="text-lg font-semibold">Sessions to verify</h3>
              </div>
              <span className="rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase">
                {reviewQueue.length} items
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border bg-background/80 p-4 text-sm"
                >
                  <p className="font-semibold">
                    Session #{item.id} / {item.taskTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Agent: {item.agent} / {item.eta}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/sessions/${item.id}`}>Open</Link>
                    </Button>
                    <Button size="sm" variant="ghost">
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-card/70 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Retention
              </p>
              <h3 className="text-lg font-semibold">Session log storage</h3>
              <p className="text-sm text-muted-foreground">
                Logs are stored in the project database. Retention is currently
                set to 90 days with weekly cleanup.
              </p>
            </div>
            <div className="mt-4 rounded-2xl border bg-background/80 p-4 text-sm">
              <p className="font-semibold">Retention policy</p>
              <p className="text-xs text-muted-foreground">
                Cleanup runs every Sunday at 02:00. 14 sessions will expire in
                the next 7 days.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline">
                  Edit policy
                </Button>
                <Button size="sm" variant="ghost">
                  Run cleanup
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
