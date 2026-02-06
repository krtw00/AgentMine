---
depends_on: []
tags: [appendix, glossary, terminology]
ai_summary: "Definitions of domain terms, technical terms, and system-specific terms, plus a record of deprecated terms"
---

# Glossary

> Status: Draft
> Last updated: 2026-02-01

This document defines the terms used in the project.

---

## How to Use the Glossary

- New terms are arranged in alphabetical order
- Abbreviations are listed alongside their full names
- On first occurrence, indicate with "XX (see Glossary)"

---

## Domain Terms

| Term          | Definition                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| AgentMine     | A project management platform that provides an execution foundation and decision-making data for AI parallel development |
| Project       | A single Git repository registered as a management unit                                                                  |
| Orchestrator  | An interface at the boundary between human and AI that handles requirements organization and decision-making             |
| Planner       | A role responsible for task decomposition and dependency design                                                          |
| Supervisor    | A role responsible for execution management (startup/shutdown/concurrency)                                               |
| Task          | A unit of development work. Has parent-child relationships and dependencies                                              |
| Run           | A single execution record for a task. Contains facts such as exit codes and logs                                         |
| Agent Profile | Execution settings including runner/model/default exclusions/DoD, etc.                                                   |
| Memory Bank   | Project knowledge accumulated as decision-making data                                                                    |

---

## Technical Terms

| Term           | Full Name                         | Definition                                                                   |
| -------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| ADR            | Architecture Decision Record      | A document that records important design decisions and their rationale       |
| API            | Application Programming Interface | An interface between applications                                            |
| Authentication | Authentication                    | A mechanism for identifying users (out of scope for MVP)                     |
| Authorization  | Authorization                     | A mechanism for controlling what operations a user can perform               |
| C4             | C4 Model                          | A diagramming method for representing software structure                     |
| DoD            | Definition of Done                | Verification criteria for completion conditions                              |
| MCP            | Model Context Protocol            | A tool integration standard for AI clients                                   |
| NFR            | Non-Functional Requirements       | Non-functional requirements (performance/reliability/operability, etc.)      |
| SSoT           | Single Source of Truth            | A design principle that designates a single authoritative information source |
| Worktree       | Git Worktree                      | An isolated working area within the same repository                          |
| SSE            | Server-Sent Events                | Unidirectional event delivery from server to client                          |

---

## System-Specific Terms

| Term             | Definition                                                                            | Related                |
| ---------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| AgentMine Home   | The home directory where AgentMine stores managed data (`~/.agentmine`)               | scope.md               |
| Local Daemon     | A resident process that provides API/event delivery/execution platform locally        | structure.md           |
| DB-as-Master     | A design principle that places the SSoT of state in the DB                            | principles.md          |
| Observable Facts | A principle that determines state based on facts rather than AI's subjective judgment | principles.md          |
| Scope Control    | A mechanism that limits access scope through physical constraints                     | principles.md          |
| scope snapshot   | A snapshot of the effective scope saved at run start                                  | data-model.md          |
| Runner           | A general term for means of executing AI (CLI/API, etc.)                              | runner-adapter.md      |
| RunnerAdapter    | An adapter that absorbs differences between runners                                   | runner-adapter.md      |
| log_ref          | A reference string for run logs                                                       | log-storage.md         |
| output_ref       | A reference string for check logs                                                     | log-storage.md         |
| Check            | A verification execution result for a run (pending/passed/failed)                     | definition-of-done.md  |
| check_key        | A check identifier (unique within a Project)                                          | definition-of-done.md  |
| DoD Runner       | A Daemon component that executes required DoD checks and records results              | structure.md           |
| head_sha         | The HEAD commit at run completion (for auditing and done-status assistance)           | data-model.md          |
| worktree_dirty   | Whether uncommitted changes exist at run completion                                   | worktree-management.md |
| Settings         | Variable settings per Project (key/value)                                             | settings.md            |
| dod_snapshot     | A snapshot of the DoD definition saved at run start                                   | settings.md            |
| Worker           | An AI that implements work in an isolated worktree                                    | structure.md           |
| Planner          | A role responsible for task decomposition and dependency design                       | task-decomposition.md  |
| Supervisor       | A role responsible for run startup/shutdown and concurrency management                | role-model.md          |
| Reviewer         | An AI responsible for DoD verification                                                | flows.md               |

---

## Deprecated Terms

| Deprecated                     | Recommended                   | Reason                                                               |
| ------------------------------ | ----------------------------- | -------------------------------------------------------------------- |
| Fully Automated AI Development | Role-Separated AI Development | To explicitly convey the separation of decision-making and execution |

---

## Related Documents

- [00-writing-guide.md](../00-writing-guide.md) - Writing guidelines
- [00-index.md](../00-index.md) - Document index
