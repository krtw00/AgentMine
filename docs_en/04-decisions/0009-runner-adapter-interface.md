---
depends_on:
  - ./0005-continue-adds-new-run.md
tags: [decisions, adr, runner, adapter]
ai_summary: "Decides to introduce RunnerAdapter to absorb differences between claude/codex and defines the interface"
---

# ADR-0009: Introduce RunnerAdapter to Absorb Runner Differences

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP targets both `claude` and `codex`.
They differ in arguments, model specification, and non-interactive execution assumptions.
Exposing these differences to the upper layers makes the UI and state management complex.

## Decision

Runner differences are absorbed by RunnerAdapter.
RunnerAdapter provides a minimal interface including start/stop, etc.

## Considered Options

### Option 1: Branch Processing Per Runner (Not Adopted)

- Pros: Fast to build
- Cons: Branches multiply. Prone to breakdown when extending

### Option 2: Introduce RunnerAdapter (Adopted)

- Pros: Upper layers become simpler. Can accommodate future API runner additions
- Cons: Abstraction design is required

## Rationale

- To make dual support for `claude`/`codex` viable from the MVP
- To keep fact collection per run (logs/exit code) consistent

## Consequences

### Positive Impact

- UI and DB models are less dependent on the specific runner
- Adding new runners is easier

### Negative Impact

- Design for exposing runner-specific features is required

## Related Documents

- [RunnerAdapter](../03-details/runner-adapter.md) - RunnerAdapter definition
