---
depends_on:
  - ../01-overview/scope.md
  - ../02-architecture/context.md
  - ../02-architecture/structure.md
tags: [decisions, adr, ui, daemon]
ai_summary: "Decides that the MVP's primary interface is Web UI, with a locally resident Daemon providing the execution platform"
---

# ADR-0003: Adopt Web UI as the Primary Interface with a Local Daemon

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP starts with local single-user operation.
We want to visualize AI execution in a browser and intervene with stop/retry/continue.
If we assume terminal multiplexing such as tmux, operations and extensibility become difficult.

## Decision

The MVP's primary interface is the Web UI.
The execution platform is provided by a locally resident Daemon.
The Daemon provides an HTTP API and event delivery, and is responsible for worktree creation, scope application, runner startup, and fact recording.

## Considered Options

### Option 1: tmux-Based Multiple Sessions (Not Adopted)

- Pros: Easy to reuse existing approaches
- Cons: Browser-based monitoring and intervention is not feasible. Difficult to extend

### Option 2: CLI-Centric (Not Adopted)

- Pros: Simple to implement
- Cons: Weak visualization and intervention experience. Logs and state tend to be scattered

### Option 3: Web UI + Local Daemon (Adopted)

- Pros: Can integrate monitoring, intervention, and approval. Easy to manage multiple Projects
- Cons: Requires implementation of a resident process and event delivery

## Rationale

- To make browser-based monitoring and intervention viable from the MVP
- To create a single control point that aligns well with DB-as-master (SSoT)
- To absorb differences between runners (`claude`/`codex`) within the Daemon

## Consequences

### Positive Impact

- Logs and state are consolidated in one place
- stop/retry/continue and violation approval can be operated consistently from the UI

### Negative Impact

- Design for Daemon startup, shutdown, and error handling is required

## Related ADRs

- [ADR-0004](./0004-agentmine-home-dir.md) - AgentMine Home decision
- [ADR-0005](./0005-continue-adds-new-run.md) - Handling of continue
