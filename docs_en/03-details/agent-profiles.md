---
depends_on:
  - ./data-model.md
  - ./scope-control.md
  - ./runner-adapter.md
  - ./log-storage.md
  - ../02-architecture/role-model.md
tags: [details, agents, profiles, prompts, execution]
ai_summary: "Defines Agent Profiles (runner/model/prompt/default scope, etc.) and their application at run start (prompt/scope composition and auditing)"
---

# Agent Profiles

> Status: Draft
> Last updated: 2026-02-01

This document defines Agent Profiles, the configuration units used during run execution.
An Agent Profile is an execution profile corresponding to roles in the role model such as "Worker/Planner/Reviewer."

---

## Purpose

- Abstract away runner differences (CLI/API, model selection, etc.) to improve run reproducibility.
- Manage role-specific prompts and default constraints (exclude, etc.) in the DB.
- Make it auditable "what was passed" at run start.

---

## Agent Profile Elements (Logical Model)

| Element | Example | Description |
|---------|---------|-------------|
| name | coder | Name for identification within a project |
| runner | `claude-cli` | Execution method |
| model | `sonnet` | Model name (optional) |
| prompt_template | role instructions | Fixed instructions for the role |
| default_exclude | `**/*.env` | Default exclusions |
| default_write_scope | `src/**` | Suggested value at task creation (optional) |
| config | temperature, etc. | Additional runner-specific settings (optional) |

Note:
- The final determination of the executable scope is made by the task's write_scope (see Scope Control).

---

## Relationship with RunnerAdapter Capabilities

Agent Profiles select a runner, so they must be consistent with the RunnerAdapter's capabilities.

| Agent Profile Element | Related Capability | Policy |
|-----------------------|-------------------|--------|
| model | supports_model | If false, model cannot be specified |
| execution mode | supports_non_interactive | If false, MVP automated execution is not possible |

Note:
- The UI restricts input based on capabilities, but the final decision is made by the Daemon (RunnerAdapter validation).

---

## Built-in Profiles (Examples)

In the MVP, minimal profiles can be prepared when a project is created.

| name | Intended Role | Characteristics |
|------|---------------|-----------------|
| generalist | Worker | General-purpose. Default when judgment is difficult |
| planner | Planner | For decomposition and planning (primarily read-only) |
| coder | Worker | For implementation |
| reviewer | Reviewer | For DoD/review (primarily read-only) |
| writer | Worker | For documentation updates |

Note:
- The actual write_scope is mandatory on the task. Profiles can hold suggested values.

---

## Application at Run Start

At run start, the Daemon determines the following and records them as facts of the run.

| Determined Item | Source | Recorded In |
|----------------|--------|-------------|
| Effective scope | task.write_scope + profile.default_exclude | runs.scope_snapshot |
| Final prompt | profile.prompt_template + task info + constraints | Run log (meta) |
| Execution environment | runner/model/config | runs + run log (meta) |

Note:
- The prompt is retained as `meta` in the run log for auditing purposes (see Log Storage, RunnerAdapter).

---

## Prompt Structure (Minimum)

The final prompt includes at least the following.

| Section | Content |
|---------|---------|
| Role | What the assignee is responsible for achieving |
| Task | title/description, done conditions |
| Constraints | write_scope, exclude, prohibited actions |
| Output | Expected deliverables (e.g., summary of changes, executed checks) |

Note:
- Not only the run's stdout/stderr, but also the prompt is retained as an "observable fact."

---

## Assignment (MVP)

In the MVP, the Human selects an Agent Profile at run start.
Even when a Planner automatically assigns profiles in the future, the assignment result will be retained as a fact of the run.

---

## Related Documents

- [Data Model](./data-model.md) - Relationship between agent_profiles and runs
- [Scope Control](./scope-control.md) - write_scope requirement and scope snapshot
- [RunnerAdapter](./runner-adapter.md) - Abstracting runner differences and non-interactive execution
- [Log Storage](./log-storage.md) - Auditing of prompts and outputs
- [Prompt Composition](./prompt-composition.md) - Runner-independent final prompt generation
- [Role Model (5 Layers)](../02-architecture/role-model.md) - Mapping between profiles and roles
