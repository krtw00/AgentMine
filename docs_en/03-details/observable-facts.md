---
depends_on:
  - ../02-architecture/principles.md
  - ./data-model.md
tags: [details, observability, facts, status]
ai_summary: "Defines Observable Facts and shows rules for automatically deriving task/run status from facts"
---

# Observable Facts

> Status: Draft
> Last updated: 2026-02-01

This document defines the "Observable Facts" that AgentMine maintains and the rules for automatically determining status based on those facts.

---

## Basic Policy

- Status is automatically determined from observable facts, not from self-reports by humans or AI.
- "done" requires **(1) merged into the base branch** AND **(2) DoD is passed**.
- As an exception, "cancelled" is a deliberate decision and only takes effect through an explicit action.

---

## Fact Categories

| Category | Examples | Primary Use |
|----------|----------|-------------|
| Process Facts | exit code / signal / started_at / finished_at | Run status determination |
| Git Facts | worktree diff, changed file list, merge determination | Scope violation detection, task completion determination |
| DoD Facts | Check exit code, log reference | DoD passed/failed determination |
| Scope Facts | Changes outside write scope, access attempts to excluded paths | Triggering needs_review |
| Manual Decisions | cancelled, violation approval/rejection | Exception handling for automatic determination |

---

## Automatic Status Determination (Overview)

The Web UI/API displays and uses the following "derived statuses."

| Target | Derived Status | Notes |
|--------|---------------|-------|
| run | running / completed / failed / cancelled | Determined from process facts |
| task | open / blocked / ready / running / needs_review / done / failed / cancelled | Determined from dependencies + observable facts |

Notes:
- In addition to `task.status`, a reason explaining "why it is in that status" is computed.
- Reasons are not stored in the DB; they are derived on demand from facts (runs/checks/scope_violations/git, etc.).

---

## Run Status Determination

| run.status | Condition (Observable Facts) |
|------------|------------------------------|
| running | finished_at is null (and process exists/existed) |
| completed | finished_at exists and exit_code = 0 |
| failed | finished_at exists and exit_code != 0 or abnormal termination (signal, etc.) |
| cancelled | cancelled_at exists due to explicit action |

---

## DoD (Definition of Done) Status Determination

DoD is treated as a "set of checks," and the aggregated result is used for task determination.
The check contents (what is required and how to execute) are defined in Project settings and are not hardcoded to tools like pnpm.
See [DoD (Definition of Done)](./definition-of-done.md) (required check definitions and aggregation) for details.

| dod.status | Condition |
|------------|-----------|
| pending | Required checks have not been executed or cannot be aggregated |
| passed | All required checks have succeeded (exit code = 0) |
| failed | At least one check has failed (exit code != 0) |

Notes:
- `dod.status` can be computed per run (aggregation of checks).
- For task done determination, the DoD result of the run whose `head_sha` is included in the base branch is used as evidence.

---

## Merge Status Determination

| merge.status | Condition |
|-------------|-----------|
| not_merged | The task's working branch has not been merged into the base branch |
| merged | The task's working branch has been merged into the base branch |

Note: Determination depends on Git facts (e.g., `git merge-base` / `git log`, etc.) and does not depend on hosting services (GitHub, etc.).
Note: For DoD "integrated" determination, the fact that the run's `head_sha` has reached the base branch is used.

---

## Scope Violation Handling (Review-Priority Mode)

Scope violations are not just "prevented" but emphasis is placed on "detecting and making them reviewable."

| Event | Record | Impact on Task |
|-------|--------|----------------|
| Changes outside write scope | Recorded in scope_violations | needs_review |
| Access/modification attempts to excluded paths | Recorded in scope_violations | needs_review |
| Violation approval | **Human only** records as a decision | Candidate for lifting needs_review |

---

## Task Status Determination (Priority Order)

The following is an "aggregated display status"; the source data remains in the facts from runs/checks/git/scope.

### Intermediate Values Used for Determination

| Name | Definition |
|------|------------|
| latest_run | The run with the most recent `started_at` |
| latest_run_dod | The DoD status aggregated from the checks of latest_run |
| merged_passed_run_exists | A run exists where the base branch contains `head_sha`, DoD is passed, and `worktree_dirty = false` |

| Priority | Condition | task.status |
|---------:|-----------|-------------|
| 1 | cancelled_at exists | cancelled |
| 2 | Dependent tasks are incomplete | blocked |
| 3 | A running run exists | running |
| 4 | Unapproved (pending) scope violations exist | needs_review |
| 5 | Rejected scope violations exist | needs_review |
| 6 | merged_passed_run_exists is true | done |
| 7 | merge.status = merged but done conditions not met | needs_review |
| 8 | latest_run_dod = failed (and no running runs) | failed |
| 9 | One or more runs exist with completed status (but not done) | ready |
| 10 | No runs exist | open |

Notes:
- `ready` is a working status meaning "execution is finished but the done conditions (merge + DoD) are not yet met."
- `needs_review` means "human or higher-level AI intervention is required."
- `rejected` is the result of a decision and is not downgraded to failed; it is kept as an "intervention reason" (preserving observable-fact-based determination).

---

## Task Reason Codes

"Reason codes" are defined for the aggregated task status, available for common use across the Web UI and API.
Reasons can be simultaneously active (assumed to be an array).

| code | Meaning | Typical Evidence (Facts) |
|------|---------|--------------------------|
| blocked_by_dependencies | Cannot execute due to incomplete dependencies | Incomplete items in task_dependencies |
| scope_violation_pending | Scope violation awaiting approval | scope_violations.approved_status = pending |
| scope_violation_rejected | Scope violation has been rejected | scope_violations.approved_status = rejected |
| dod_pending | Required checks are incomplete | Missing checks, cannot aggregate |
| dod_failed | Required checks have failed | checks.status = failed |
| merge_pending | Not yet merged | merge.status = not_merged |
| run_failed | A failed run exists and progress is halted | runs.status = failed (and no running runs) |

Notes:
- Compound codes (e.g., `merged_but_dod_pending`) are not defined. If needed, they are expressed as a combination of multiple reasons.
- The details associated with each reason (target IDs/paths/check names, etc.) are expected to be traceable through separate fact references (e.g., `scope_violations` list, `checks` list).

---

## Related Documents

- [Design Principles](../02-architecture/principles.md) - Observable Facts / Reproducibility First principles
- [Data Model](./data-model.md) - Entity definitions that hold facts
- [Scope Control](./scope-control.md) - Scope physical constraints and violation detection/review
