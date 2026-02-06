---
depends_on:
  - ../02-architecture/structure.md
  - ./data-model.md
  - ./event-stream.md
tags: [details, api, endpoints, rest]
ai_summary: "Defines the API overview, common specifications, and endpoint list"
---

# API Design

> Status: Draft
> Last updated: 2026-02-02

Defines the API specifications between the Web UI and Daemon.

---

## API Overview

| Item | Details |
|------|---------|
| Purpose | Unified layer between Web UI and Daemon |
| Base URL | `http://127.0.0.1:{port}` |
| Authentication | None (MVP: single-user local operation) |
| Request format | JSON |
| Response format | JSON |

Note: The Web UI references the API using relative paths (`/api/...`).

---

## HTTP Methods

| Method | Usage |
|--------|-------|
| GET | Retrieve resources |
| POST | Create resources, execute actions |
| PATCH | Partially update resources |
| DELETE | Delete resources |

---

## Response Format

### On Success

| Pattern | Format |
|---------|--------|
| Single resource | `{ "data": {...} }` |
| List | `{ "data": [...], "pagination": {...} }` |
| Action | `{ "data": {...}, "message": "..." }` |

### On Error

| Field | Content |
|-------|---------|
| error.code | Error code |
| error.message | Error message |
| error.details | Detailed information (optional) |

---

## Error Codes

| code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Input validation error |
| NOT_FOUND | 404 | Resource does not exist |
| CONFLICT | 409 | State conflict |
| PRECONDITION_FAILED | 412 | Precondition not met |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Pagination

Used in list APIs.

| Parameter | Default | Description |
|-----------|---------|-------------|
| limit | 20 | Number of items to retrieve (max 100) |
| offset | 0 | Number of items to skip |

The response `pagination` object includes `total` and `has_more`.

---

## Endpoint List

### Projects / Tasks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | Project list |
| `/api/projects` | POST | Register project |
| `/api/projects/:id` | GET/PATCH/DELETE | Project operations |
| `/api/projects/:projectId/tasks` | GET/POST | Task list/creation |
| `/api/tasks/:id` | GET/PATCH | Task details/update |
| `/api/tasks/:id/cancel` | POST | Cancel task |
| `/api/tasks/:id/dependencies` | POST/DELETE | Dependency operations |

For details, see [API - Projects/Tasks](./api-projects-tasks.md).

### Runs / Checks / Violations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks/:taskId/runs` | GET/POST | Run list/start |
| `/api/runs/:id` | GET | Run details |
| `/api/runs/:id/stop` | POST | Stop run |
| `/api/runs/:id/retry` | POST | Retry |
| `/api/runs/:id/continue` | POST | Continue |
| `/api/runs/:id/log` | GET | Run log |
| `/api/runs/:runId/checks` | GET | Check list |
| `/api/runs/:runId/checks/rerun` | POST | Rerun checks |
| `/api/scope-violations/:id/approve` | POST | Approve violation |
| `/api/scope-violations/:id/reject` | POST | Reject violation |

For details, see [API - Runs](./api-runs.md).

### Profiles / Settings / Others

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/runners` | GET | Runner list |
| `/api/projects/:projectId/agent-profiles` | GET/POST | Profile list/creation |
| `/api/agent-profiles/:id` | GET/PATCH/DELETE | Profile operations |
| `/api/projects/:projectId/settings` | GET/PATCH | Settings |
| `/api/projects/:projectId/monitor` | GET | Monitor aggregation |
| `/api/projects/:projectId/files` | GET | File tree |
| `/api/events` | GET | SSE stream |

For details, see [API - Profiles/Settings](./api-profiles-settings.md).

---

## Related Documents

- [API - Projects/Tasks](./api-projects-tasks.md) - Details of Project/Task operations
- [API - Runs](./api-runs.md) - Details of Run/Check/Violation operations
- [API - Profiles/Settings](./api-profiles-settings.md) - Details of Profile/Settings/Monitor operations
- [Data Model](./data-model.md) - Entity definitions
- [Event Stream](./event-stream.md) - SSE event types
