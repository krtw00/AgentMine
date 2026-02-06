---
depends_on:
  - ../01-overview/scope.md
tags: [decisions, adr, filesystem]
ai_summary: "Decides to consolidate AgentMine's managed data (DB/logs/worktrees, etc.) under ~/.agentmine"
---

# ADR-0004: AgentMine Home Is `~/.agentmine`

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP handles multiple Projects (multiple Git repositories).
Placing state and logs under each Project risks repository pollution and operational fragmentation.
On the other hand, worktrees can be created outside of Git repositories.

## Decision

The location for data managed by AgentMine (DB, logs, worktrees, etc.) is consolidated under `~/.agentmine`.

## Considered Options

### Option 1: Place Under Each Project (Not Adopted)

- Pros: Easy to reference. Simple to relocate
- Cons: Pollutes repositories. Operations become fragmented as Projects increase

### Option 2: Specify an Arbitrary Dedicated Directory (Deferred)

- Pros: Flexible for enterprise use cases
- Cons: Requires initial configuration

### Option 3: Consolidate Under `~/.agentmine` (Adopted)

- Pros: Can start without configuration. Consistent across multiple Projects
- Cons: Worktrees reside outside the repository. Disk management is required

## Rationale

- To get the MVP running without configuration first
- To prevent state from being scattered across multiple Projects

## Consequences

### Positive Impact

- Easy to locate DB/logs/worktrees
- Does not pollute repositories

### Negative Impact

- Disk usage management and cleanup are required
- A request to make the path configurable may arise in the future

## Related ADRs

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon
