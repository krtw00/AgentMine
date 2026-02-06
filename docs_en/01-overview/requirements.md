---
depends_on:
  - ./summary.md
  - ./scope.md
  - ../02-architecture/principles.md
tags: [overview, requirements]
ai_summary: "Defines MVP functional requirements (Project/Task/Run/Scope/DoD/Visualization)"
---

# Functional Requirements

> Status: Draft
> Last updated: 2026-02-01

This document defines the functional requirements for the MVP.
Requirements assume local single-user operation.

---

## Project Management

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-001 | Project registration | Register a local Git repository as a Project | MUST |
| FR-002 | Project switching | Switch between Projects in the Web UI | MUST |
| FR-003 | Base branch management | Configure a base branch per Project | MUST |

---

## Task Management

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-010 | Task creation | Register title/description | MUST |
| FR-011 | Parent-child tasks | Express parent-child relationships | SHOULD |
| FR-012 | Dependencies | Express inter-task dependencies (blocked_by) | MUST |
| FR-013 | write_scope required | Prevent execution if a Task's write_scope is not set | MUST |
| FR-014 | Derived state | Derive and display Task state from facts | MUST |

---

## Run Management (Execution)

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-020 | Start run | Select an agent profile and start a run | MUST |
| FR-021 | Stop | Stop a running run | MUST |
| FR-022 | Retry | Add a new run to the same Task | MUST |
| FR-023 | Continue | Add a new run to the same Task | MUST |
| FR-024 | Log display | View stdout/stderr of a run | MUST |
| FR-025 | Multi-run | Hold multiple runs per Task | MUST |

Note:
- continue/retry are not additional inputs to the same run (see ADR).

---

## Worktree Management

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-030 | Worktree creation | Create a branch + worktree per Task | MUST |
| FR-031 | Worktree reuse | Runs of the same Task use the same worktree | MUST |
| FR-032 | Worktree location | Worktrees are created under AgentMine Home | MUST |

---

## Scope Control

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-040 | Exclude enforcement | Exclude items can be removed from worktrees | MUST |
| FR-041 | Read-only enforcement | Everything outside write scope can be made read-only | MUST |
| FR-042 | Violation detection | Detect and record changes outside write scope | MUST |
| FR-043 | Approve/reject | Approve or reject violations | MUST |
| FR-044 | scope_snapshot | Save the effective scope for each run | MUST |

---

## DoD (Verification)

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-050 | DoD execution | Execute DoD after a run | MUST |
| FR-051 | Result recording | Save results as checks | MUST |
| FR-052 | Done determination | Derive done status from merge + DoD passed | MUST |

---

## Visualization and Events

| # | Requirement | Description | Priority |
|---:|-------------|-------------|:--------:|
| FR-060 | SSE | Deliver run logs and state changes as events | MUST |
| FR-061 | Task Monitor | List Tasks and run statuses | MUST |
| FR-062 | Pending approval display | Display the reason for needs_review | MUST |

---

## Related Documents

- [Project Overview](./summary.md) - One-page overview
- [Scope and Out-of-Scope](./scope.md) - Phases and exclusions
- [Design Principles](../02-architecture/principles.md) - No decision-making / DB as truth
- [Key Flows](../03-details/flows.md) - Run start and intervention
