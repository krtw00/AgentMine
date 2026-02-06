---
depends_on:
  - ./ui-mvp.md
  - ./event-stream.md
  - ./observable-facts.md
  - ../02-architecture/role-model.md
tags: [details, ui, live-view, monitoring, autonomous]
ai_summary: "Specification for Task Live View (S006). Defines monitoring of all Roles in autonomous AI operation, intervention operations, and real-time streaming"
---

# Task Live View (S006)

> Status: Draft
> Last updated: 2026-02-02

Defines the screen for real-time monitoring of all Roles operating within a single Task.

---

## Purpose

| Item | Description |
|------|-------------|
| Monitoring | View the progress of each Role in autonomous AI operation at a glance |
| Intervention | Allow Humans to stop/instruct/approve during anomalies |
| Transparency | Display per-Role log output via live streaming |

---

## Routing

| Route | Screen |
|-------|--------|
| `/p/:projectId/tasks/:taskId/live` | Task Live View |

Navigate from the Monitor's Run list via the "Live" button.

---

## Autonomous Driving Model

AI autonomously processes the Task, and Humans only monitor and intervene.

| Role | Launch | Description |
|------|--------|-------------|
| Orchestrator | Auto-launched at Task start | Overall Task management |
| Planner | Launched by Orchestrator | Planning and subtask decomposition |
| Supervisor | Launched by Planner | Worker progress management |
| Worker | Launched by Supervisor | Actual work (code generation, etc.) |
| Reviewer | Launched by Worker | Deliverable review |

Notes:
- Each Role is launched by the preceding Role (launch chain).
- Humans generally do not intervene. Operations are only performed during anomalies.

---

## Screen Layout

### Header

| Display | Content |
|---------|---------|
| Task info | title, description |
| Overall status | running/needs_review/completed/failed |
| Auto badge | Display "Auto" during autonomous driving |

### Role Flow Timeline

| Display | Content |
|---------|---------|
| Flow diagram | Orchestrator -> Planner -> Supervisor -> Worker -> Reviewer |
| Each Role's status | pending/running/completed/failed (color-coded) |
| Current position | Highlight the currently running Role |

### Role Panes

Five Role panes arranged vertically. Each pane is collapsible.

| Display | Content |
|---------|---------|
| Role name | Orchestrator/Planner/Supervisor/Worker/Reviewer |
| Status | pending/running/completed/failed |
| Output | Live streaming (stdout/stderr) |
| Summary | Display result summary upon completion |

Notes:
- Running Roles are auto-expanded.
- Completed/failed Roles are collapsed.
- Each pane is designed with a tmux-style split layout in mind.

### Summary Section

| Display | Content |
|---------|---------|
| DoD | Check result list (passed/failed/pending) |
| Violations | Scope violation list and approval status |
| Subtasks | Subtask progress (if Planner decomposed) |

### Alert Banner

| Condition | Display |
|-----------|---------|
| needs_review | Display "Human intervention required" banner |
| failed | Display "Role has failed" banner |
| scope_violation | Display "Scope violation detected" banner |

---

## Operations

| Operation | Target | Description |
|-----------|--------|-------------|
| Stop | Running Role | Stop the currently running Role |
| Continue | failed/completed Role | Resume with additional instructions |
| Approve | scope_violation | Approve the violation |
| Reject | scope_violation | Reject the violation |
| Escalate | Any Role | Escalate to a higher-level Role |

---

## SSE Event Handling

| Event | Handling |
|-------|---------|
| run.started | Set the corresponding Role's pane to running and start Output stream |
| run.output | Append to Output |
| run.finished | Update the corresponding Role's status, display summary |
| check.updated | Update DoD section |
| scope_violation.created | Add to Violations section, display Alert |

---

## Integration with Monitor Screen

The following additions are made to Monitor (S001).

| Addition | Content |
|----------|---------|
| Live button | Navigation button to Task Live View |
| Auto badge | Display "Auto" badge on Tasks in autonomous driving mode |

---

## Related Documents

- [UI Specification (MVP)](./ui-mvp.md) - Full screen list
- [Role Model](../02-architecture/role-model.md) - 5-layer Role definition
- [Event Streaming](./event-stream.md) - SSE events
- [Observable Facts](./observable-facts.md) - Status derivation
