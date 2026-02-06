---
depends_on:
  - ../03-details/flows.md
  - ../03-details/data-model.md
tags: [decisions, adr, execution]
ai_summary: "Decides that continue/retry creates a new run rather than appending input to the same run"
---

# ADR-0005: continue/retry Creates a New Run

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP supports both `claude` and `codex` as runners.
These CLIs differ in interactivity and input/output handling.
Making "additional input to the same process" work from a browser requires PTY-level implementation.
Considering reproducibility and operational cost, interactive continuation poses high risk for the MVP.

## Decision

`continue` and `retry` are operations that create a new run for the same task.
The input for the new run includes a summary of facts from the previous run (diffs, failure reasons, unresolved issues).

## Considered Options

### Option 1: Append Input to the Same Run (Not Adopted)

- Pros: Conversational and natural
- Cons: Large differences between runners. Requires PTY, etc. Reduces reproducibility

### Option 2: Create a New Run (Adopted)

- Pros: Easy to absorb runner differences. High reproducibility. Simple to implement
- Cons: Conversational experience is weaker

## Rationale

- To make dual support for `claude`/`codex` viable from the MVP
- To fix facts (logs/diffs/verification results) per run, prioritizing reproducibility

## Consequences

### Positive Impact

- Runs are clearly delineated, making diff review and tracking easier
- UI/DB models become simpler

### Negative Impact

- Conversational continuation experience is weaker
- Quality of crafted input (previous run summary) affects outcomes

## Related ADRs

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon
