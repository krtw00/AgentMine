---
depends_on:
  - ../04-decisions/0004-agentmine-home-dir.md
  - ./data-model.md
  - ./scope-control.md
  - ./business-rules.md
  - ./definition-of-done.md
tags: [details, git, worktree, branches, lifecycle]
ai_summary: "Defines per-Task worktree/branch operations (naming, creation/reuse/deletion, dirty handling, recorded Git facts)"
---

# Worktree Management

> Status: Draft
> Last updated: 2026-02-01

This document defines the operational rules for Git worktrees created per Task.
Worktrees are the execution context for runs and serve as the foundation for reproducibility and safety.

---

## Purpose

- Enable parallel task progress on the same repository.
- Fix the run execution directory, ensuring consistent reference points for logs and facts.
- Create the precondition for physically applying scope control (exclude/read/write).

---

## Basic Policy (MVP)

| Item | Policy |
|------|--------|
| Unit | **1 Task = 1 worktree** |
| Reuse | Runs for the same Task use the same worktree |
| Parallelism | Concurrent runs for the same Task are prohibited (see Business Rules) |
| Auto-deletion | Not supported (explicit operation only) |

---

## Naming Convention (MVP)

### Worktree Path

Worktrees are placed under the AgentMine Home directory.

| Item | Format |
|------|--------|
| Root | `~/.agentmine/worktrees/` |
| Location | `~/.agentmine/worktrees/{project_id}/task-{task_id}/` |

Note:
- `project_id` is used as a separator to support multiple projects on the same machine.

### Task Branch Name

Task working branches are created in the following format.

| Item | Format |
|------|--------|
| Branch name | `agentmine/task-{task_id}` |

Notes:
- The branch name serves as an identifier for worktree identity and auditing.
- Handling of conflicts with existing branches is a future extension (in the MVP, conflicts result in an error).

---

## Lifecycle

### Creation (First Run)

At the start of the first run, the Daemon performs the following:

1. Create a worktree for the Project's `repo_path`.
2. Create a task branch from the tip of the base branch.
3. Check out to the worktree directory.

Note:
- Base branch updates (fetch/rebase, etc.) are not automated in the MVP.

### Reuse (Subsequent Runs)

If a worktree already exists for the same Task, the Daemon reuses it.
If the worktree is missing, it is recreated.

### Deletion (Explicit Operation)

Worktree deletion is performed only through explicit operations.
Deletion includes both "directory deletion" and "git worktree removal."

Note:
- Worktree deletion is destructive, so even in the MVP, strong confirmation is required in the UI when the worktree is dirty.

---

## Dirty (Uncommitted Changes) Handling

In the MVP, starting a run on a dirty worktree is permitted.
However, since dirty state reduces reproducibility, it is recorded as an observable fact and displayed explicitly in the UI.

| Situation | Policy |
|-----------|--------|
| At run start | Can start even when dirty (prioritizing continue/retry usability) |
| At run end | Record dirty status (see Data Model) |
| Done determination | Dirty runs are not used as evidence for done determination (see DoD / Observable Facts) |

Note:
- Running DoD on a dirty state is permitted, but it is not used as done evidence.

---

## Recorded Git Facts (MVP)

The Daemon records the following Git facts at run completion.

| Fact | Storage | Use |
|------|---------|-----|
| `head_sha` | runs.head_sha | Reference point for DoD and merge determination |
| `worktree_dirty` | runs.worktree_dirty | Exclusion from done determination, intervention reason |

Note:
- Changed file lists and diffs may be retained as log (meta) when needed.

---

## Related Documents

- [Data Model](./data-model.md) - worktree_path/branch_name/head_sha/worktree_dirty
- [Scope Control](./scope-control.md) - Physical constraints on the worktree
- [Business Rules](./business-rules.md) - Prohibition of concurrent runs for the same Task
- [DoD (Definition of Done)](./definition-of-done.md) - Dirty runs are not used as done evidence
- [ADR-0004](../04-decisions/0004-agentmine-home-dir.md) - `~/.agentmine`
