import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const tasks = [
  {
    id: "T-104",
    title: "Implement auth middleware",
    status: "In Progress",
    priority: "High",
    type: "Feature",
    assignee: "Nora",
    eta: "Mar 12",
    updated: "2h ago",
    labels: ["API", "Security"],
    subtasks: 3,
  },
  {
    id: "T-103",
    title: "Design task detail panel",
    status: "Open",
    priority: "Medium",
    type: "Design",
    assignee: "Ken",
    eta: "Mar 14",
    updated: "5h ago",
    labels: ["UX", "UI"],
    subtasks: 2,
  },
  {
    id: "T-102",
    title: "Fix session cancel race",
    status: "Blocked",
    priority: "High",
    type: "Bug",
    assignee: "Liu",
    eta: "Mar 10",
    updated: "1d ago",
    labels: ["Runtime"],
    subtasks: 0,
  },
  {
    id: "T-101",
    title: "Draft onboarding docs",
    status: "Done",
    priority: "Low",
    type: "Docs",
    assignee: "Ari",
    eta: "Mar 6",
    updated: "3d ago",
    labels: ["Docs"],
    subtasks: 0,
  },
  {
    id: "T-100",
    title: "Wire up task filters",
    status: "In Progress",
    priority: "Medium",
    type: "Feature",
    assignee: "Mia",
    eta: "Mar 11",
    updated: "6h ago",
    labels: ["Web UI"],
    subtasks: 4,
  },
];

const statusTone: Record<string, string> = {
  Open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "In Progress": "border-amber-200 bg-amber-50 text-amber-700",
  Blocked: "border-rose-200 bg-rose-50 text-rose-700",
  Done: "border-slate-200 bg-slate-100 text-slate-700",
};

const priorityTone: Record<string, string> = {
  High: "border-rose-200 bg-rose-50 text-rose-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-slate-200 bg-slate-100 text-slate-700",
};

const selectedTask = tasks[0];

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage, filter, and prioritize every task in the workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline">Import</Button>
          <Button variant="secondary">Bulk edit</Button>
          <Button>New task</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Search
              </p>
              <Input placeholder="Filter by title, assignee, or label" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Status
              </p>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option>All status</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Blocked</option>
                <option>Done</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Priority
              </p>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option>All priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Type
              </p>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option>All types</option>
                <option>Feature</option>
                <option>Bug</option>
                <option>Design</option>
                <option>Docs</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Sort
              </p>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option>Updated desc</option>
                <option>Priority desc</option>
                <option>Due date asc</option>
                <option>Title asc</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary">
              List
            </Button>
            <Button size="sm" variant="outline">
              Board
            </Button>
            <Button size="sm" variant="outline">
              Hierarchy
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>12 tasks</span>
          <span>4 open</span>
          <span>3 in progress</span>
          <span>1 blocked</span>
          <span>4 done</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Task List</h2>
                <p className="text-xs text-muted-foreground">
                  Filtered view showing 5 of 12 tasks.
                </p>
              </div>
              <Button size="sm" variant="outline">
                Export CSV
              </Button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Task</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Assignee</th>
                    <th className="px-4 py-2 text-left">ETA</th>
                    <th className="px-4 py-2 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-t transition hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {task.id}
                            </span>
                            <span className="font-medium">{task.title}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {task.labels.map((label) => (
                              <span
                                key={`${task.id}-${label}`}
                                className="rounded-full border border-border bg-background px-2 py-0.5"
                              >
                                {label}
                              </span>
                            ))}
                            {task.subtasks > 0 ? (
                              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                                {task.subtasks} subtasks
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[task.status] ?? ""}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone[task.priority] ?? ""}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.type}
                      </td>
                      <td className="px-4 py-3">{task.assignee}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.eta}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Task detail
                </p>
                <h3 className="text-lg font-semibold">
                  {selectedTask.id} · {selectedTask.title}
                </h3>
              </div>
              <Button size="sm" variant="outline">
                Edit
              </Button>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[selectedTask.status] ?? ""}`}
                >
                  {selectedTask.status}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone[selectedTask.priority] ?? ""}`}
                >
                  {selectedTask.priority}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold">
                  {selectedTask.type}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Build the API layer that validates session tokens, refreshes
                expired credentials, and reports errors to the orchestrator.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Assignee</p>
                  <p className="font-medium">{selectedTask.assignee}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-medium">{selectedTask.eta}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="font-medium">task-104-auth-middleware</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="font-medium">{selectedTask.updated}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Subtasks
              </p>
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm">
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span>Define JWT validation flow</span>
                    <span className="text-xs text-muted-foreground">
                      In progress
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Document token renewal</span>
                    <span className="text-xs text-muted-foreground">Open</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Update session error handling</span>
                    <span className="text-xs text-muted-foreground">
                      Blocked
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm">Start session</Button>
              <Button size="sm" variant="outline">
                View history
              </Button>
              <Button size="sm" variant="ghost">
                Copy task link
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Create or edit
                </p>
                <h3 className="text-lg font-semibold">Task form</h3>
              </div>
              <Button size="sm" variant="secondary">
                Save draft
              </Button>
            </div>
            <form className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Title
                </label>
                <Input defaultValue="Implement auth middleware" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Status
                  </label>
                  <select
                    defaultValue="In Progress"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Priority
                  </label>
                  <select
                    defaultValue="Medium"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Type
                  </label>
                  <select
                    defaultValue="Feature"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option>Feature</option>
                    <option>Bug</option>
                    <option>Design</option>
                    <option>Docs</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    ETA
                  </label>
                  <Input defaultValue="Mar 12" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Description
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  defaultValue="Validate session tokens, refresh credentials, and notify the orchestrator on failures."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Assignee
                  </label>
                  <Input defaultValue="Nora" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Branch
                  </label>
                  <Input defaultValue="task-104-auth-middleware" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="size-4 rounded border border-input"
                  />
                  Require reviewer approval
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border border-input"
                  />
                  Notify assignee on save
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button">Save task</Button>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="button" variant="ghost">
                  Duplicate
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
