---
depends_on:
  - ./api.md
  - ./data-model.md
  - ./runner-adapter.md
tags: [details, api, runners, profiles, settings, monitor]
ai_summary: "Defines the request/response specifications for Runner/Agent Profile/Settings/Monitor/Files/Events APIs"
---

# API - Profiles / Settings / Others

> Status: Draft
> Last updated: 2026-02-02

Defines the detailed API specifications for Runner/Agent Profile/Settings/Monitor/Files/Events. For common specifications, see [API Design](./api.md).

---

## Runners

### GET /api/runners

Retrieves the list of available runners and their capabilities.

| Response | Description |
|----------|-------------|
| name | Runner identifier |
| display_name | Display name |
| capabilities.supports_model | Whether model specification is supported |
| capabilities.supports_non_interactive | Whether non-interactive execution is supported |
| capabilities.supports_prompt_file_inclusion | Whether file embedding is supported |
| capabilities.available_models | List of available models |

---

## Agent Profiles

### GET /api/projects/:projectId/agent-profiles

| Response | Description |
|----------|-------------|
| id, project_id, name, description | Identification information |
| runner, model | Execution settings |
| prompt_template | Role instructions |
| default_exclude, default_write_scope | Default scope |
| config | Additional runner-specific settings |

### POST /api/projects/:projectId/agent-profiles

| Request | Required | Description |
|---------|:--------:|-------------|
| name | Yes | Display name (unique within the project) |
| description | - | Description |
| runner | Yes | Runner name |
| model | - | Model name (only when supports_model=true) |
| prompt_template | - | Role instructions |
| default_exclude | Yes | Default exclusions (glob array) |
| default_write_scope | - | Suggested write_scope value |
| config | - | Additional runner-specific settings |

| Validation | Error |
|------------|-------|
| Runner exists | VALIDATION_ERROR |
| When model is specified, supports_model=true | VALIDATION_ERROR |
| Name is unique within the project | CONFLICT |

### GET /api/agent-profiles/:id

Response includes runner_capabilities (the runner's capabilities).

### DELETE /api/agent-profiles/:id

| Validation | Error |
|------------|-------|
| Not in use by a currently running run | CONFLICT |

---

## Settings

### GET /api/projects/:projectId/settings

| Response | Description |
|----------|-------------|
| scope.defaultExclude | Project-wide exclude (glob array) |
| dod.requiredChecks | Array of required check definitions |

Each element of dod.requiredChecks:

| Field | Description |
|-------|-------------|
| check_key | Check identifier |
| label | UI display name |
| command | Execution command |
| timeout_sec | Timeout (optional) |
| required | Required flag |

### PATCH /api/projects/:projectId/settings

Updates only the specified keys. Changes apply to subsequent runs.

| Validation | Error |
|------------|-------|
| Each element of dod.requiredChecks has check_key/label/command | VALIDATION_ERROR |
| check_key is unique within the project | VALIDATION_ERROR |

---

## Monitor

### GET /api/projects/:projectId/monitor

Retrieves aggregated data for the monitor screen.

| Query Parameter | Description |
|----------------|-------------|
| status | Filter by run status |
| task_id | Filter by task |
| agent_profile_id | Filter by agent_profile |
| since | Only runs after the specified time |

| Response | Description |
|----------|-------------|
| summary | Aggregated information (total_tasks, running_runs, needs_review_tasks, failed_tasks) |
| tasks | Task array (including children, each task includes a runs array) |
| overview | Time distribution (time_range, activity array) |

---

## Files

### GET /api/projects/:projectId/files

Retrieves the file tree (for write_scope selection UI).

| Query Parameter | Default | Description |
|----------------|---------|-------------|
| path | . | Starting directory (relative path) |
| depth | 2 | Depth to expand |

| Response | Description |
|----------|-------------|
| path | File/directory path |
| type | file/directory |
| children | Child element array (null means not expanded) |

---

## Events (SSE)

### GET /api/events

Receives events via SSE.

| Query Parameter | Description |
|----------------|-------------|
| project_id | Filter (all projects if omitted) |

For event format and event type details, see [Event Stream](./event-stream.md).

---

## Related Documents

- [API Design](./api.md) - Common specifications and endpoint list
- [Data Model](./data-model.md) - Entity definitions for agent_profiles/settings
- [RunnerAdapter](./runner-adapter.md) - Capabilities definition
- [Event Stream](./event-stream.md) - SSE event types
- [Agent Profiles](./agent-profiles.md) - Profile concepts and usage
- [Project Settings](./settings.md) - Details of setting keys
