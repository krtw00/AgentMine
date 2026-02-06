---
depends_on:
  - ../02-architecture/principles.md
  - ../03-details/observable-facts.md
tags: [decisions, adr, status, dod]
ai_summary: "Decides that task done status is automatically determined by 'merged' AND 'DoD passed'"
---

# ADR-0002: Definition of Done Is Determined by "Merged" AND "DoD Passed"

> Status: Accepted
> Last updated: 2026-02-01

## Context

AgentMine is designed to automatically determine state based on "observable facts."
This requires defining which facts determine when a task is complete (done).

## Decision

A task is considered done when **both** of the following conditions are met:

1. Merged into the base branch (merge.status = merged)
2. DoD has passed (dod.status = passed)

## Considered Options

### Option 1: Done on Merge Only

- Pros: Simple and lightweight to operate
- Cons: Weak quality gate; difficult to establish reproducible completion criteria

### Option 2: Done on DoD Only

- Pros: Quality-centric completion
- Cons: Results are not integrated until merged, creating a gap with project management completion

### Option 3: Merge + DoD (Adopted)

- Pros: Satisfies both "integrated" and "verified" simultaneously
- Cons: Requires establishing DoD definition and execution

## Rationale

- To eliminate ambiguity in done criteria and prioritize reproducibility
- To clearly display "what is missing" in the Web UI (monitoring and intervention)

## Consequences

### Positive Impact

- Done status is unambiguous, making auditing and automation easier
- Web UI and API share the same criteria

### Negative Impact

- Implementation of a DoD Runner and check recording is required

## Related ADRs

- None

## Related Documents

- [Design Principles](../02-architecture/principles.md) - Observable facts / reproducibility-first
- [Observable Facts](../03-details/observable-facts.md) - Automatic determination rules
