---
depends_on:
  - ../04-decisions/0004-agentmine-home-dir.md
  - ../04-decisions/0008-log-storage-as-files.md
  - ./data-model.md
tags: [details, logs, storage, audit]
ai_summary: "Defines the log storage strategy for runs/checks (~/. agentmine/logs, reference fields, retention policy)"
---

# Log Storage

> Status: Draft
> Last updated: 2026-02-01

This document defines the log storage strategy.
In the MVP, logs are stored as files, and the DB holds references to them.

---

## Purpose

- Preserve run output for auditing and reproducibility
- Enable viewing run logs from the Web UI
- Prevent the DB from bloating with large log data

---

## Log Types

| Type       | Unit   | Content                         |
| ---------- | ------ | ------------------------------- |
| run log    | run    | Runner's stdout/stderr          |
| check log  | check  | Verification output such as DoD |
| daemon log | daemon | Startup/shutdown/errors, etc.   |

---

## Storage Location (MVP)

Logs are stored under the AgentMine Home directory.

```
~/.agentmine/
  logs/
    runs/
    checks/
    daemon/
```

---

## Reference Method

Log files are identified by reference strings (log_ref / output_ref).
References are stored in the DB.

| Target | Field      | Purpose             |
| ------ | ---------- | ------------------- |
| run    | log_ref    | Run log reference   |
| check  | output_ref | Check log reference |

---

## Format (MVP)

Logs are append-only.
Each record occupies one line.

| Field     | Description                     |
| --------- | ------------------------------- |
| timestamp | Output timestamp                |
| stream    | stdout / stderr / meta          |
| data      | Output text or meta information |

Note:

- `meta` is used for tracking information other than stdout/stderr, such as the prompt at run start.

---

## Retention and Deletion

In the MVP, logs are not automatically deleted.
Deletion is performed through explicit operations.

Note:

- In the future, retention periods and size limits will be added to Project settings.

---

## Related Documents

- [Data Model](./data-model.md) - log_ref / output_ref
- [ADR-0004](../04-decisions/0004-agentmine-home-dir.md) - `~/.agentmine`
- [ADR-0008](../04-decisions/0008-log-storage-as-files.md) - Log storage strategy
