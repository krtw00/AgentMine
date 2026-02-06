---
depends_on: []
tags: [navigation, index]
ai_summary: "Navigation hub for all documentation"
---

# Document Index

> Status: Active
> Last updated: 2026-02-06

This document provides navigation for the entire design documentation.

---

## Document Structure

```mermaid
flowchart LR
    A[01-overview<br/>Big Picture] --> B[02-architecture<br/>Design]
    B --> C[03-details<br/>Details]
    C --> D[04-decisions<br/>Decision Records]
```

| Level | Purpose | Target Audience |
|-------|---------|-----------------|
| **01-overview** | What to build and why | First-time readers, refreshers |
| **02-architecture** | How it is structured | Design comprehension |
| **03-details** | Concrete specifications | Implementation reference |
| **04-decisions** | Why certain choices were made | Decision rationale |

---

## Document List

### 00 - Meta Documents

| Document | Description |
|----------|-------------|
| [00-index.md](./00-index.md) | This document. Overall navigation |
| [00-writing-guide.md](./00-writing-guide.md) | Writing Standards (writing style) |
| [00-format-guide.md](./00-format-guide.md) | Formatting Standards (structure, metadata, diagrams, naming) |
| [00-git-guide.md](./00-git-guide.md) | Git Standards (commits, branches, change history) |
| [development-setup.md](./development-setup.md) | Development environment setup guide |

### 01 - Overview (Big Picture)

| Document | Description |
|----------|-------------|
| [summary.md](./01-overview/summary.md) | Project overview (one-page summary) |
| [goals.md](./01-overview/goals.md) | Goals and problems to solve |
| [scope.md](./01-overview/scope.md) | Scope and out-of-scope |
| [requirements.md](./01-overview/requirements.md) | Functional requirements (MVP) |

### 02 - Architecture (Design)

| Document | Description |
|----------|-------------|
| [principles.md](./02-architecture/principles.md) | Design principles (SSoT philosophy) |
| [context.md](./02-architecture/context.md) | System boundary and external integrations |
| [structure.md](./02-architecture/structure.md) | Major component structure |
| [role-model.md](./02-architecture/role-model.md) | Role model (5 layers) |
| [tech-stack.md](./02-architecture/tech-stack.md) | Technology stack |
| [non-functional.md](./02-architecture/non-functional.md) | Non-functional requirements (MVP) |

### 03 - Details (Specifications)

| Document | Description |
|----------|-------------|
| [data-model.md](./03-details/data-model.md) | Data model and ER diagram |
| [observable-facts.md](./03-details/observable-facts.md) | Observable facts (automatic state determination rules) |
| [business-rules.md](./03-details/business-rules.md) | Business rules (invariants / concurrency constraints) |
| [task-decomposition.md](./03-details/task-decomposition.md) | Task decomposition (criteria / patterns) |
| [scope-control.md](./03-details/scope-control.md) | Scope control (worktree isolation and physical constraints) |
| [daemon.md](./03-details/daemon.md) | Local Daemon (startup / shutdown) |
| [event-stream.md](./03-details/event-stream.md) | Event delivery (SSE) |
| [runner-adapter.md](./03-details/runner-adapter.md) | RunnerAdapter (abstracting differences between Claude/Codex) |
| [agent-profiles.md](./03-details/agent-profiles.md) | Agent Profiles (runner/model/prompt) |
| [prompt-composition.md](./03-details/prompt-composition.md) | Prompt composition (runner-independent) |
| [definition-of-done.md](./03-details/definition-of-done.md) | DoD definition (required checks and aggregation) |
| [worktree-management.md](./03-details/worktree-management.md) | Worktree operations (naming/reuse/deletion/dirty) |
| [settings.md](./03-details/settings.md) | Project settings (key structure and snapshots) |
| [log-storage.md](./03-details/log-storage.md) | Log storage (references and retention) |
| [api.md](./03-details/api.md) | API design (Web UI / Daemon) |
| [ui.md](./03-details/ui.md) | UI design (overview) |
| [ui-mvp.md](./03-details/ui-mvp.md) | UI specification (MVP) |
| [flows.md](./03-details/flows.md) | Key flows and sequences |
| [authorization.md](./03-details/authorization.md) | Authentication and authorization (MVP) |
| [memory-layer.md](./03-details/memory-layer.md) | Memory layer (project memory persistence + Memory Governance) |
| [proof-carrying-run.md](./03-details/proof-carrying-run.md) | Proof-Carrying Run (automatic proof bundle generation) |
| [conflict-aware-scheduler.md](./03-details/conflict-aware-scheduler.md) | Conflict-Aware Scheduler (collision avoidance scheduler) |

### 04 - Decisions (Decision Records)

| Document | Description |
|----------|-------------|
| [0001-template.md](./04-decisions/0001-template.md) | ADR template |
| [0002-definition-of-done.md](./04-decisions/0002-definition-of-done.md) | Done determination (merge + DoD) |
| [0003-local-daemon-and-web-ui.md](./04-decisions/0003-local-daemon-and-web-ui.md) | Web UI + Local Daemon |
| [0004-agentmine-home-dir.md](./04-decisions/0004-agentmine-home-dir.md) | AgentMine Home (`~/.agentmine`) |
| [0005-continue-adds-new-run.md](./04-decisions/0005-continue-adds-new-run.md) | continue/retry creates a new run |
| [0006-task-write-scope-required.md](./04-decisions/0006-task-write-scope-required.md) | write_scope required + scope snapshot |
| [0007-event-stream-uses-sse.md](./04-decisions/0007-event-stream-uses-sse.md) | Event delivery uses SSE |
| [0008-log-storage-as-files.md](./04-decisions/0008-log-storage-as-files.md) | Logs stored as files |
| [0009-runner-adapter-interface.md](./04-decisions/0009-runner-adapter-interface.md) | RunnerAdapter introduction |
| [0010-daemon-single-instance-and-localhost.md](./04-decisions/0010-daemon-single-instance-and-localhost.md) | localhost single instance |
| [0011-ui-serving-hybrid-mode.md](./04-decisions/0011-ui-serving-hybrid-mode.md) | UI serving approach (dev separation + production same-process) |
| [0012-memory-layer.md](./04-decisions/0012-memory-layer.md) | Memory Layer introduction |
| [0013-repositioning.md](./04-decisions/0013-repositioning.md) | Repositioning (AI-independent, safety, team-oriented) |

### 99 - Appendix

| Document | Description |
|----------|-------------|
| [glossary.md](./99-appendix/glossary.md) | Glossary |

---

## Reading Guide

### First-Time Readers

1. [summary.md](./01-overview/summary.md) - Grasp the project overview
2. [goals.md](./01-overview/goals.md) - Understand the goals
3. [principles.md](./02-architecture/principles.md) - Understand the design philosophy

### Understanding the Design

1. [structure.md](./02-architecture/structure.md) - Component structure
2. [role-model.md](./02-architecture/role-model.md) - Roles and separation of concerns
3. [tech-stack.md](./02-architecture/tech-stack.md) - Technology selection rationale
4. [04-decisions/](./04-decisions/) - Design decision rationale

### Implementation Reference

1. [data-model.md](./03-details/data-model.md) - Data structures
2. [flows.md](./03-details/flows.md) - Process flows
3. [glossary.md](./99-appendix/glossary.md) - Terminology reference

---

## Related Documents

- [Writing Standards](./00-writing-guide.md) - Writing style rules
- [Formatting Standards](./00-format-guide.md) - Structure, metadata, diagrams, and naming conventions
- [Git Standards](./00-git-guide.md) - Commits, branches, and change history
