---
depends_on:
  - ./api.md
  - ./daemon.md
  - ./event-stream.md
  - ./observable-facts.md
  - ./agent-profiles.md
  - ./settings.md
  - ./definition-of-done.md
  - ./scope-control.md
  - ./worktree-management.md
tags: [details, ui, mvp, navigation, interaction]
ai_summary: "Defines the MVP Web UI specification (information architecture, screens, main operations, SSE integration, empty state/error display)"
---

# UI Specification (MVP)

> Status: Draft
> Last updated: 2026-02-02

This document defines the minimum specification for implementing the MVP Web UI.
The UI handles "monitoring and intervention," and the source of truth for state is the DB.

---

## UI Principles

| Principle            | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| Monitoring first     | Execution status and "stuck points" are visible at a glance             |
| Intervention capable | stop/retry/continue/approve, etc. can be executed without hesitation    |
| Fact-based           | Do not display self-reports. Display facts (logs/checks/violations/git) |
| Re-fetchable         | Can recover via API re-fetch even after SSE disconnection               |

---

## Information Architecture (Navigation)

The MVP switches screens on a per-Project basis.
A side navigation is always displayed after Project selection.

| Item                 | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| Project Switcher     | Displayed at the top to switch Projects                        |
| Side navigation      | Monitor / Runs / Agent Profiles / Settings                     |
| Connection indicator | Always displays SSE connection status (connected/disconnected) |

---

## Routing (Conceptual)

| Route                              | Screen           | Purpose                                                  |
| ---------------------------------- | ---------------- | -------------------------------------------------------- |
| `/`                                | Project Switcher | Project selection/registration                           |
| `/p/:projectId/monitor`            | Task Monitor     | Monitoring and main operations                           |
| `/p/:projectId/runs`               | Runs             | Run list and filters                                     |
| `/p/:projectId/runs/:runId`        | Run Detail       | Log/check/fact viewing                                   |
| `/p/:projectId/agents`             | Agent Profiles   | Execution profile management                             |
| `/p/:projectId/settings`           | Settings         | `scope.defaultExclude` / `dod.requiredChecks` management |
| `/p/:projectId/tasks/:taskId/live` | Task Live View   | Monitor all Roles within a Task                          |

Note:

- Routing implementation (Next.js app router, etc.) is left to the implementation.

---

## UI Delivery Model (Hybrid)

In production (operations), the Daemon serves the UI (single process).
During development, the UI runs on a separate port as a dev server, proxying `/api/*` and `/api/events` to the Daemon.

| Aspect             | Production                  | Development                  |
| ------------------ | --------------------------- | ---------------------------- |
| UI delivery        | Daemon serves               | Dev server serves            |
| API/SSE            | Provided on the same origin | Dev server proxies to Daemon |
| UI reference paths | Relative paths (`/api/...`) | Relative paths (`/api/...`)  |

Note:

- The UI does not hold "Daemon host/port" as a configuration setting.

---

## Data Updates (SSE + Re-fetch)

| Item             | Policy                                                 |
| ---------------- | ------------------------------------------------------ |
| SSE subscription | Subscribe to `/api/events` while a Project is selected |
| Reconnection     | Automatic reconnection                                 |
| Re-fetch         | Re-fetch necessary resources via API upon reconnection |

Target events follow [Event Streaming](./event-stream.md).

---

## Screen Specifications (MVP)

### Project Switcher (S000)

| Display      | Content                                                    |
| ------------ | ---------------------------------------------------------- |
| Project list | name/repo_path/base_branch                                 |
| Empty state  | Show registration guidance when no Projects are registered |

| Operation            | Validation                                            |
| -------------------- | ----------------------------------------------------- |
| Project registration | repo_path must be a Git repo, base_branch is required |

### Task Monitor (S001)

Displays an "Overview + Run list table + Waterfall" in a Chrome DevTools Network-style layout at all times.
The detail panel opens on run selection and is collapsed by default (collapsible).
The Monitor is the screen for determining "what is happening now" and "what the human should intervene on next" in the shortest time.

| Area         | Display                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Overview     | Time distribution of executions (Network Overview-style). Visualizes activity by status. Follows the current selection/filtered list |
| Table        | Run list (status/task/reasons/agent_profile/started/duration/dod/violations/head_sha/worktree_dirty)                                 |
| Waterfall    | Run start/end/execution time visualization (on the right)                                                                            |
| Detail panel | Facts of the selected run (logs/checks/violations/git/worktree). Collapsed when nothing is selected                                  |

Notes:

- Tasks do not require a dedicated tree screen. In the MVP, "Group by task (parent-child hierarchy)" is ON by default.
- Parent-child hierarchy is expressed by `tasks.parent_id`. The UI can collapse/expand parent tasks.
- A toggle to switch to a flat Run list is provided (optional).

#### Filters (MVP)

| Type          | Example                                |
| ------------- | -------------------------------------- |
| status        | running / failed / completed           |
| reason codes  | needs_review reasons, dod_failed, etc. |
| task          | task_id, title search                  |
| agent_profile | name                                   |

| Operation      | Condition/Behavior                                                                           |
| -------------- | -------------------------------------------------------------------------------------------- |
| Create Task    | title/write_scope are required. Dependencies are optional. Can start a run after creation    |
| start run      | Not allowed without write_scope (show setup guidance). Select an Agent Profile               |
| stop           | Shown only for running runs                                                                  |
| retry          | Adds a new run to the target Task (no additional input)                                      |
| continue       | Requests additional input and adds a new run                                                 |
| approve/reject | Approves/rejects scope violations (Human only)                                               |
| Live           | Navigate to Task Live View (S006). Display an "Auto" badge when autonomous driving is active |

Notes:

- No free-form input field for start run. Instruction changes are made via task.description updates or continue.
- write_scope can be entered by selecting from a file tree (directories/files). The actual value is a glob array.
- To hide personal information from AI, use exclude instead of write_scope. exclude is managed in Settings (`scope.defaultExclude`).
- Place a link to exclude settings (Settings) near the Task creation/editing area.

### Runs (S003)

| Display  | Content                                                                  |
| -------- | ------------------------------------------------------------------------ |
| Run list | status/started_at/finished_at/task/agent_profile/head_sha/worktree_dirty |
| Filters  | status, task, agent_profile                                              |

| Operation              | Condition/Behavior |
| ---------------------- | ------------------ |
| Navigate to Run Detail | Select a run       |

### Run Detail (within S003)

Displays run facts in tabs.

| Tab          | Content                                      |
| ------------ | -------------------------------------------- |
| Output       | Run log (stdout/stderr)                      |
| Meta         | Prompt, environment, digest, etc. (meta)     |
| Checks       | DoD check results and log references         |
| Violations   | scope_violations list and approval status    |
| Git/Worktree | branch/worktree_path/head_sha/worktree_dirty |

### Agent Profiles (S004)

| Display            | Content                                                            |
| ------------------ | ------------------------------------------------------------------ |
| List               | name/runner/model (optional)/default_exclude                       |
| Detail             | prompt_template, default_write_scope (optional), config (optional) |
| Capability display | Show supports_model, etc. and make input support explicit          |

### Settings (S005)

| Setting                | Content                                          |
| ---------------------- | ------------------------------------------------ |
| `scope.defaultExclude` | Project-wide exclude (glob array)                |
| `dod.requiredChecks`   | Required check definitions (label/command, etc.) |

Notes:

- Settings changes apply to subsequent runs. Past runs are interpreted using snapshots (see Project Settings).
- `scope.defaultExclude` assumes a hybrid input of file tree selection (B) + glob entry (C).

---

## Empty States and Error Display (MVP)

| State             | Display                                              |
| ----------------- | ---------------------------------------------------- |
| No Projects       | Project registration guidance                        |
| No Agent Profiles | Creation guidance (start run not available)          |
| DoD undefined     | DoD displayed as `pending`, show Settings guidance   |
| SSE disconnected  | Disconnected indicator + re-fetch button             |
| Cannot start run  | Clearly state the reason (e.g., write_scope not set) |

---

## Related Documents

- [Task Live View (S006)](./ui-task-live-view.md) - Monitor all Roles within a Task
- [UI Design (Overview)](./ui.md) - Screen list and direction
- [API Design](./api.md) - UI/Daemon API
- [Event Streaming](./event-stream.md) - SSE events
- [Observable Facts](./observable-facts.md) - Status derivation and reason codes
- [Agent Profiles](./agent-profiles.md) - Execution profiles
- [Project Settings](./settings.md) - `scope.defaultExclude` / `dod.requiredChecks`
- [DoD (Definition of Done)](./definition-of-done.md) - Check results
- [Scope Control](./scope-control.md) - Intervention reasons (violations)
- [Worktree Management](./worktree-management.md) - Worktree facts
