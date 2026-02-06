---
depends_on:
  - ./api.md
  - ./scope-control.md
  - ./observable-facts.md
tags: [details, authorization, security, roles]
ai_summary: "Defines the MVP authentication/authorization policy and permission boundaries (human/daemon/runner) per operation (API)"
---

# Authentication & Authorization

> Status: Draft
> Last updated: 2026-02-01

This document defines how authentication and authorization are handled in the MVP.
The MVP is designed for single-user local operation, prioritizing "boundaries that reduce accidental misuse" over strong security perimeters.

---

## Assumptions (MVP)

| Item           | Policy                                  |
| -------------- | --------------------------------------- |
| Authentication | None (no login)                         |
| Users          | Same user on the same PC only           |
| Connection     | localhost only (not exposed externally) |

Note:

- Since no authentication is performed, "authorization" in the MVP primarily serves as a specification for separation of responsibilities and prevention of accidental misuse.

---

## Actors (Agents)

| Actor          | Example                     | Description                                                |
| -------------- | --------------------------- | ---------------------------------------------------------- |
| Human User     | Browser UI operator         | The entity with ultimate responsibility for all operations |
| Local Daemon   | API/DB/execution management | The entity that performs DB updates and event delivery     |
| Runner Process | `claude`/`codex` CLI        | External process executed in a worktree                    |

---

## Permission Boundaries (MVP)

### Basic Rules

- Only the Local Daemon performs DB updates.
- Runner Processes do not directly access the DB.
- Only the Human User performs "approvals/rejections."

### Approval Targets

The following are representative examples requiring human approval in the MVP.

| Target                             | Reason                                           |
| ---------------------------------- | ------------------------------------------------ |
| Scope violation approval/rejection | Changes outside the write scope require judgment |

---

## Operation Matrix (MVP)

### Write Operations

| Operation                          | Human User | Local Daemon | Runner Process | Notes                                                   |
| ---------------------------------- | :--------: | :----------: | :------------: | ------------------------------------------------------- |
| Project register/update            |    Yes     |     Yes      |       No       | UI requests via API                                     |
| Task create/update                 |    Yes     |     Yes      |       No       | Tasks without write_scope cannot be executed            |
| Run start/stop                     |    Yes     |     Yes      |       No       | Runner is the execution target, not the operation agent |
| Scope violation approval/rejection |    Yes     |     Yes      |       No       | This is a human-only decision                           |
| Log deletion                       |    Yes     |     Yes      |       No       | Explicit operation only                                 |

### Read Operations

| Operation                 | Human User | Local Daemon | Runner Process | Notes                                           |
| ------------------------- | :--------: | :----------: | :------------: | ----------------------------------------------- |
| Task/Run list and details |    Yes     |     Yes      |       No       | UI retrieves via API                            |
| Run log viewing           |    Yes     |     Yes      |       No       | Logs are for reference and not stored in the DB |
| Event subscription (SSE)  |    Yes     |     Yes      |       No       | UI subscribes to `/api/events`                  |

---

## Future Extensions (Out of Scope)

| Candidate Requirements | Meaning                                                  |
| ---------------------- | -------------------------------------------------------- |
| Authentication         | Identify users via tokens/SSO, etc.                      |
| Roles                  | Separate permissions into Owner/Operator/Reviewer, etc.  |
| Remote connections     | Define security perimeters for exposure beyond localhost |

---

## Related Documents

- [API Design](./api.md) - API between UI and Daemon
- [Scope Control](./scope-control.md) - Violation detection and approval
- [Observable Facts](./observable-facts.md) - Human-only decisions (e.g., cancelled)
