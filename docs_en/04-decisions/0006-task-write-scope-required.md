---
depends_on:
  - ../03-details/scope-control.md
  - ../03-details/data-model.md
tags: [decisions, adr, safety, scope]
ai_summary: "Decides that write_scope is required for tasks in the MVP and scope_snapshot is saved in the run"
---

# ADR-0006: Task write_scope Is Required, and scope_snapshot Is Saved in the Run

> Status: Accepted
> Last updated: 2026-02-01

## Context

Scope control is introduced from the MVP.
While we want to maintain flexibility in scoping, a default-allow approach (`**/*`) has low safety.
Additionally, if scope templates (Project/agent profile) change later, evaluation of past runs becomes inconsistent.

## Decision

In the MVP, the task's `write_scope` is explicitly required.
The effective scope at execution time is saved in the run as `scope_snapshot`.

## Considered Options

### Option 1: Make write_scope Optional with Broad Default Permissions (Not Adopted)

- Pros: Less input required, easier to get started
- Cons: Difficult to prevent unintended changes. Low safety

### Option 2: Require write_scope (Adopted)

- Pros: High safety. Intent is clear before execution
- Cons: More input required when creating tasks

## Rationale

- To make scope control effective from the MVP
- To supplement "freedom" with templates (Project/agent profile), while requiring explicit final permission at the task level
- To fix evaluation criteria (scope) in the run for reproducibility

## Consequences

### Positive Impact

- Blast radius is limited
- Past run evaluations are unaffected by template changes

### Negative Impact

- UI input assistance (templates, suggestions) is required

## Related ADRs

- [ADR-0004](./0004-agentmine-home-dir.md) - AgentMine Home
- [ADR-0005](./0005-continue-adds-new-run.md) - Per-run execution
