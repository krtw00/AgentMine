---
depends_on:
  - ./api.md
  - ../02-architecture/tech-stack.md
  - ../04-decisions/0007-event-stream-uses-sse.md
tags: [details, events, sse, streaming]
ai_summary: "Defines the event delivery method (SSE) to the Web UI, event types, and reconnection policy"
---

# Event Stream

> Status: Draft
> Last updated: 2026-02-01

This document defines event delivery to the Web UI.
The MVP adopts SSE (Server-Sent Events).

---

## Purpose

- Display run logs in real time
- Reflect state changes immediately in the UI
- Eliminate the need for mandatory polling

---

## Connection Method

| Item | Policy |
|------|--------|
| Protocol | SSE |
| Endpoint | `GET /api/events` |
| Direction | Unidirectional, server to client |
| Reconnection | Web UI automatically reconnects |

Note:
- After reconnection, the Web UI re-fetches the necessary state via API.
- The MVP does not maintain a persistent event backlog.

---

## Event Types (MVP)

| event | Trigger | Primary Usage |
|-------|---------|---------------|
| run.output | stdout/stderr/meta output produced | Log display |
| run.status_changed | Run state changed | Reflect execution state |
| check.status_changed | Check state changed | Reflect DoD results |
| scope_violation.created | Scope violation detected | Present pending approvals |
| scope_violation.decided | Approval/rejection finalized | Reflect needs_review |

---

## Common Event Fields

Event data is JSON.
All events have common fields.

| Field | Required | Description |
|-------|:--------:|-------------|
| id | Yes | Event ID (monotonically increasing) |
| type | Yes | Event type |
| timestamp | Yes | Occurrence time |

---

## run.output

| Field | Required | Description |
|-------|:--------:|-------------|
| run_id | Yes | Target run |
| stream | Yes | stdout / stderr / meta |
| data | Yes | Output text |

Note:
- The authoritative source for received logs is the log file (see Log Storage).

---

## Error Handling

| Event | Behavior |
|-------|----------|
| SSE disconnection | Web UI reconnects |
| Daemon restart | Web UI re-fetches state |
| Event loss | Web UI re-fetches run details and logs |

---

## Related Documents

- [API Design](./api.md) - Endpoints
- [Tech Stack](../02-architecture/tech-stack.md) - Rationale for SSE adoption
- [ADR-0007](../04-decisions/0007-event-stream-uses-sse.md) - SSE adoption
- [Log Storage](./log-storage.md) - Authoritative source for logs
