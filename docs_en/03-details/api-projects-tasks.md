---
depends_on:
  - ./api.md
  - ./data-model.md
tags: [details, api, projects, tasks]
ai_summary: "Defines the request/response specifications for Project/Task/Dependencies APIs"
---

# API - Projects / Tasks

> Status: Draft
> Last updated: 2026-02-02

Defines the detailed API specifications for Project/Task/Dependencies. For common specifications, see [API Design](./api.md).

---

## Projects

### POST /api/projects

Registers a project.

| Request | Required | Type | Description |
|---------|:--------:|------|-------------|
| name | Yes | string | Display name |
| repo_path | Yes | string | Absolute path to the Git repository |
| base_branch | Yes | string | Base branch |

| Validation | Error |
|------------|-------|
| repo_path is a Git repository | VALIDATION_ERROR |
| base_branch exists | VALIDATION_ERROR |

| Response | Description |
|----------|-------------|
| id | Created Project ID |
| name, repo_path, base_branch | Registered content |

### GET /api/projects/:id

| Response | Description |
|----------|-------------|
| id, name, repo_path, base_branch | Project information |

### PATCH /api/projects/:id

Updates only the specified fields.

| Request | Required | Description |
|---------|:--------:|-------------|
| name | - | Display name |
| base_branch | - | Base branch |

### DELETE /api/projects/:id

Deletes a project. Related Tasks/Runs/worktrees are not deleted.

---

## Tasks

### GET /api/projects/:projectId/tasks

| Query Parameter | Description |
|----------------|-------------|
| status | Filter (open/blocked/ready/running/needs_review/done/failed/cancelled) |
| parent_id | Filter by parent task (null for top-level only) |
| include_children | Include child tasks (default: true) |

| Response | Description |
|----------|-------------|
| id, project_id, parent_id | Task identification information |
| title, description, write_scope | Task content |
| status, reasons | State derived from observable facts |
| children | Child task array (when include_children=true) |

### POST /api/projects/:projectId/tasks

| Request | Required | Type | Description |
|---------|:--------:|------|-------------|
| title | Yes | string | Task name |
| description | - | string | Details |
| write_scope | Yes | string[] | Editable scope (glob array) |
| parent_id | - | integer | Parent task ID |
| depends_on | - | integer[] | Dependency task ID array |

| Validation | Error |
|------------|-------|
| write_scope has at least one entry | VALIDATION_ERROR |
| parent_id is within the same project | VALIDATION_ERROR |
| depends_on are within the same project | VALIDATION_ERROR |
| No circular dependencies | VALIDATION_ERROR |

### GET /api/tasks/:id

| Response | Description |
|----------|-------------|
| Basic information | id, project_id, parent_id, title, description, write_scope |
| State | status, reasons, cancelled_at |
| Dependencies | dependencies array (task_id, title, status) |
| Latest run | latest_run (id, status, started_at, finished_at) |

### PATCH /api/tasks/:id

| Request | Required | Description |
|---------|:--------:|-------------|
| title | - | Task name |
| description | - | Details |
| write_scope | - | Editable scope |

Note: Changes to write_scope of a running task take effect at the next run start.

### POST /api/tasks/:id/cancel

Cancels a task. If there is a running run, it is stopped simultaneously.

| Validation | Error |
|------------|-------|
| Not already done/cancelled | CONFLICT |

| Response | Description |
|----------|-------------|
| status | cancelled |
| cancelled_at | Cancellation timestamp |

---

## Task Dependencies

### POST /api/tasks/:id/dependencies

| Request | Required | Description |
|---------|:--------:|-------------|
| depends_on_task_id | Yes | Dependency target task ID |

| Validation | Error |
|------------|-------|
| Task is within the same project | VALIDATION_ERROR |
| No circular dependencies | VALIDATION_ERROR |
| Not a duplicate | CONFLICT |

### DELETE /api/tasks/:id/dependencies/:dependsOnId

Deletes a dependency. Response is 204 No Content.

---

## Related Documents

- [API Design](./api.md) - Common specifications and endpoint list
- [Data Model](./data-model.md) - Entity definitions for projects/tasks/task_dependencies
- [Observable Facts](./observable-facts.md) - Derivation rules for task.status
