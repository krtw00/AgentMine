---
depends_on:
  - ./data-model.md
  - ./flows.md
  - ./observable-facts.md
  - ./scope-control.md
tags: [details, business-rules, invariants, concurrency]
ai_summary: "Defines business rules (invariants, concurrency constraints, semantics of retry/continue) for Project/Task/Run/Worktree"
---

# Business Rules

> Status: Draft
> Last updated: 2026-02-01

This document defines the business rules (invariants) for AgentMine's core entities.
These rules are "commitments" that must be maintained regardless of implementation changes.

---

## Basic Principles

- The DB is the SSoT for state. UI display is derived from facts.
- Runs are history; the basic operation is "appending" rather than overwriting existing runs.
- "Judgment" is the responsibility of the Human User; the Runner focuses solely on execution.

---

## Invariants

### Project

| Rule | Meaning |
|------|---------|
| 1 Project = 1 Git repo | `repo_path` serves as the identity of the Project |
| Base branch required | Must always have a basis for done judgment |

### Task

| Rule | Meaning |
|------|---------|
| Task must belong to a Project | `project_id` is required |
| Dependencies must not form cycles | task_dependencies do not allow circular references |
| Execution not allowed without write_scope | Agreement on the work scope is required before execution |

### Run

| Rule | Meaning |
|------|---------|
| Run belongs to a Task | `task_id` is required |
| Runs grow by appending | retry/continue add a "new run" |
| Run must have a worktree | Fixes the identity of the execution context |
| Run must have a scope snapshot | Enables reproduction of the effective scope at execution time |

---

## Concurrency Constraints (MVP)

| Constraint | Policy | Reason |
|------------|--------|--------|
| Concurrent runs for the same Task | Prohibited | They share the same worktree and would conflict |
| Concurrent runs across different Tasks | Allowed | Leverages task independence |

Note:
- If run start requests for the same Task overlap, the Daemon rejects the start request (requiring a stop first).

---

## Semantics of retry / continue (MVP)

Both retry and continue are operations that "add a new run."
The difference lies in the "intent of the input given to the new run."

| Operation | Intent | Expected Input |
|-----------|--------|----------------|
| retry | Retry under the same conditions | Summary of failure causes or unresolved issues from the previous run |
| continue | Continue with additional instructions | retry input + additional input from the Human User |

Note:
- The actual input (prompt passed to the runner) is the responsibility of the RunnerAdapter and is retained in a traceable form in the run log.

---

## State Handling (Derived State)

Task/Run states are derived from facts.
State derivation rules follow the [Observable Facts](./observable-facts.md) (derived state rules).

---

## Related Documents

- [Data Model](./data-model.md) - Entities and relationships
- [Key Flows](./flows.md) - Typical operations (start/stop/retry/continue)
- [Observable Facts](./observable-facts.md) - State derivation rules
- [Scope Control](./scope-control.md) - write_scope and violation handling
