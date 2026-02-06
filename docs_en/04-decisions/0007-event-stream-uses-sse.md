---
depends_on:
  - ../02-architecture/tech-stack.md
tags: [decisions, adr, events, sse]
ai_summary: "Decides to adopt SSE as the event delivery mechanism to the Web UI"
---

# ADR-0007: Event Delivery Adopts SSE

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP starts with local single-user operation.
The Web UI needs to display run logs and state changes in real time.
However, bidirectional communication is not a requirement for the MVP.

## Decision

SSE (Server-Sent Events) is adopted as the event delivery mechanism to the Web UI.

## Considered Options

### Option 1: Polling (Not Adopted)

- Pros: Simple to implement
- Cons: Not suitable for log display. Increases load and latency

### Option 2: WebSocket (Not Adopted)

- Pros: Bidirectional
- Cons: Implementation and operation are more complex. Overkill for the MVP

### Option 3: SSE (Adopted)

- Pros: Server-to-client streaming is simple
- Cons: No bidirectionality

## Rationale

- The direction needed for the MVP is unidirectional
- Operational cost is low for local operation

## Consequences

### Positive Impact

- Run logs can be displayed in real time
- Reconnection is easy for the UI

### Negative Impact

- Additional input from the UI requires a separate channel (HTTP)

## Related Documents

- [Technology Stack](../02-architecture/tech-stack.md) - Rationale for SSE adoption
- [Event Delivery](../03-details/event-stream.md) - Event types
