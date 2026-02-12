---
depends_on:
  - ../04-decisions/0002-definition-of-done.md
  - ./data-model.md
  - ./observable-facts.md
  - ./log-storage.md
  - ./business-rules.md
tags: [details, dod, checks, quality-gate]
ai_summary: "Defines the concrete specifications for DoD (Definition of Done): required check definitions, execution timing, result recording, and aggregation rules"
---

# DoD (Definition of Done)

> Status: Draft
> Last updated: 2026-02-01

This document defines the concrete specifications for DoD (Definition of Done).
The decision that done judgment requires both "merge" and "DoD passed" was already made in ADR-0002.

---

## Purpose

- Enable each project to define "verifications (checks) required for completion."
- Execute checks against run deliverables and record the results as observable facts.
- Make done judgment reproducible, establishing completion criteria that do not depend on human subjectivity.

---

## Assumptions (MVP)

| Item                | Policy                                                 |
| ------------------- | ------------------------------------------------------ |
| Definition location | Managed in the DB (Project settings)                   |
| Execution agent     | Executed by the Local Daemon (DoD Runner)              |
| Execution location  | Executed in the target run's worktree                  |
| Failure judgment    | exit code != 0 is treated as failed                    |
| Logs                | Check logs are saved as files; the DB holds references |

---

## Check Definitions (Project Settings)

DoD is "a set of required checks."
Required checks are held as `dod.requiredChecks` in Project settings (see Project Settings).

### Check Definition Elements (Logical Model)

| Element     | Required | Description                                                    |
| ----------- | :------: | -------------------------------------------------------------- |
| check_key   |   Yes    | Check identifier (unique within Project)                       |
| label       |   Yes    | UI display name                                                |
| command     |   Yes    | Execution command (single shell line)                          |
| timeout_sec |    -     | Timeout (optional)                                             |
| working_dir |    -     | Relative path within the worktree (optional, defaults to root) |
| required    |   Yes    | Whether required for DoD (MVP handles only required checks)    |

Note:

- Command contents depend on the project. They are not fixed to pnpm or any specific tool.

---

## Execution Timing (MVP)

The DoD Runner executes required checks after a run completes.
Additionally, "manual re-execution" is permitted.

| Timing               | Execution | Purpose                                    |
| -------------------- | --------- | ------------------------------------------ |
| After run completion | Automatic | Always leave verification results as facts |
| Manual operation     | Optional  | For environment recovery or reconfirmation |

---

## Result Recording (Checks)

Check results are recorded as `checks` in the DB.
Check logs are saved as files, and the DB holds references (output_ref).
Checks are executed against "the code (HEAD) pointed to by the run."

| Recorded Item | Storage          | Notes                          |
| ------------- | ---------------- | ------------------------------ |
| status        | DB (checks)      | pending/passed/failed          |
| exit_code     | DB (checks)      | 0=passed, otherwise=failed     |
| output_ref    | DB (checks)      | Log reference                  |
| stdout/stderr | File (check log) | For auditing and visualization |

Note:

- The commit targeted for execution is recorded as `runs.head_sha` (see Data Model).
  Note:
- The DoD definition is saved as a snapshot at run start time in `runs.dod_snapshot` (see Project Settings).

---

## Aggregation Rules (DoD Status)

DoD status is the "aggregated result of required checks."
The "list of required checks" needed for aggregation is determined from Project settings.

| dod.status | Condition                                                         |
| ---------- | ----------------------------------------------------------------- |
| pending    | Required checks have not been executed, or results are incomplete |
| failed     | At least one required check failed                                |
| passed     | All required checks passed                                        |

Decisions:

- Projects with no required checks defined are treated as `pending` (DoD cannot be established).
- Runs with `worktree_dirty = true` are not used as evidence for done judgment (see Worktree Management).

---

## Relationship to Done Judgment

Done judgment follows ADR-0002 and is established when both of the following are met.

1. Merged to the base branch
2. DoD status is passed

Note:

- Depending on the merge method (squash, etc.), the commit to which DoD is linked varies.
- In the MVP, `runs.head_sha` reaching the base branch is treated as evidence that "DoD results have been integrated."

---

## Related Documents

- [ADR-0002](../04-decisions/0002-definition-of-done.md) - Done judgment (merge + DoD)
- [Observable Facts](./observable-facts.md) - Derivation of DoD status
- [Data Model](./data-model.md) - checks/output_ref
- [Log Storage](./log-storage.md) - Storage of check logs
- [Business Rules](./business-rules.md) - Runs are append-only, re-execution handling
- [Worktree Management](./worktree-management.md) - Handling of dirty runs
- [Project Settings](./settings.md) - `dod.requiredChecks` and snapshots
