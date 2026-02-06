---
depends_on:
  - ./api.md
  - ./data-model.md
  - ./observable-facts.md
tags: [details, api, runs, checks, violations]
ai_summary: "Defines the request/response specifications for Run/Check/Scope Violation APIs"
---

# API - Runs / Checks / Violations

> Status: Draft
> Last updated: 2026-02-02

Defines the detailed API specifications for Run/Check/Scope Violation. For common specifications, see [API Design](./api.md).

---

## Runs

### GET /api/tasks/:taskId/runs

| Query Parameter | Description                                 |
| --------------- | ------------------------------------------- |
| status          | Filter (running/completed/failed/cancelled) |

| Response                                             | Description                |
| ---------------------------------------------------- | -------------------------- |
| id, task_id, agent_profile_id                        | Identification information |
| status, exit_code                                    | Execution result           |
| started_at, finished_at, cancelled_at                | Timestamps                 |
| branch_name, worktree_path, head_sha, worktree_dirty | Git information            |
| dod_status, scope_violation_count                    | Derived information        |

### POST /api/tasks/:taskId/runs

Starts a run.

| Request          | Required | Description          |
| ---------------- | :------: | -------------------- |
| agent_profile_id |   Yes    | Agent Profile to use |

| Validation                               | Error               |
| ---------------------------------------- | ------------------- |
| task.write_scope is configured           | PRECONDITION_FAILED |
| No running run for the same task         | CONFLICT            |
| Task is not done/cancelled               | CONFLICT            |
| All dependency tasks are done            | PRECONDITION_FAILED |
| Runner has supports_non_interactive=true | PRECONDITION_FAILED |

### GET /api/runs/:id

| Response          | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| Basic information | id, task_id, task_title, agent_profile_id, agent_profile_name |
| Execution result  | status, exit_code, started_at, finished_at, cancelled_at      |
| Git information   | branch_name, worktree_path, head_sha, worktree_dirty          |
| Snapshots         | scope_snapshot, dod_snapshot                                  |
| Related data      | checks array, scope_violations array                          |

### POST /api/runs/:id/stop

| Validation     | Error    |
| -------------- | -------- |
| Run is running | CONFLICT |

| Response     | Description    |
| ------------ | -------------- |
| status       | cancelled      |
| cancelled_at | Stop timestamp |

### POST /api/runs/:id/retry

Creates a new run with the same task and same agent_profile.

| Validation                       | Error    |
| -------------------------------- | -------- |
| Original run has completed       | CONFLICT |
| No running run for the same task | CONFLICT |

### POST /api/runs/:id/continue

Creates a new run with additional input.

| Request          | Required | Description             |
| ---------------- | :------: | ----------------------- |
| additional_input |   Yes    | Additional instructions |

| Validation                       | Error            |
| -------------------------------- | ---------------- |
| Original run has completed       | CONFLICT         |
| No running run for the same task | CONFLICT         |
| additional_input is not empty    | VALIDATION_ERROR |

### GET /api/runs/:id/log

| Query Parameter | Default | Description                             |
| --------------- | ------- | --------------------------------------- |
| stream          | all     | stdout/stderr/meta/all                  |
| tail            | -       | Retrieve only the last N lines          |
| since_line      | -       | Retrieve from the specified line onward |

| Response              | Description                                           |
| --------------------- | ----------------------------------------------------- |
| lines                 | Log line array (line_number, timestamp, stream, data) |
| total_lines, has_more | Pagination information                                |

---

## Checks

### GET /api/runs/:runId/checks

| Response                     | Description                |
| ---------------------------- | -------------------------- |
| id, run_id, check_key, label | Identification information |
| kind, status, exit_code      | Execution result           |
| output_ref                   | Log reference              |

### POST /api/runs/:runId/checks/rerun

| Request    | Required | Description                             |
| ---------- | :------: | --------------------------------------- |
| check_keys |    -     | Checks to rerun (all checks if omitted) |

| Validation        | Error               |
| ----------------- | ------------------- |
| Run has completed | CONFLICT            |
| Worktree exists   | PRECONDITION_FAILED |

---

## Scope Violations

### GET /api/runs/:runId/scope-violations

| Response         | Description                            |
| ---------------- | -------------------------------------- |
| id, run_id, path | Identification information             |
| reason           | Violation reason (outside_write, etc.) |
| approved_status  | pending/approved/rejected              |
| decided_at       | Decision timestamp                     |

### POST /api/scope-violations/:id/approve

| Validation                 | Error    |
| -------------------------- | -------- |
| approved_status is pending | CONFLICT |

| Response        | Description        |
| --------------- | ------------------ |
| approved_status | approved           |
| decided_at      | Approval timestamp |

### POST /api/scope-violations/:id/reject

| Validation                 | Error    |
| -------------------------- | -------- |
| approved_status is pending | CONFLICT |

| Response        | Description         |
| --------------- | ------------------- |
| approved_status | rejected            |
| decided_at      | Rejection timestamp |

---

## Related Documents

- [API Design](./api.md) - Common specifications and endpoint list
- [Data Model](./data-model.md) - Entity definitions for runs/checks/scope_violations
- [Observable Facts](./observable-facts.md) - Derivation rules for run.status/dod_status
- [Log Storage](./log-storage.md) - Format of log_ref/output_ref
