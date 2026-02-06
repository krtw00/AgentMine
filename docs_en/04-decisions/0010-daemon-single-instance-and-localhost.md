---
depends_on:
  - ./0003-local-daemon-and-web-ui.md
tags: [decisions, adr, daemon, lifecycle]
ai_summary: "Decides that the Daemon runs as a single instance on localhost, serving both UI and API from the same origin"
---

# ADR-0010: Daemon Runs as a Single Instance on localhost, Serving UI and API

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP is local single-user operation.
If the UI and API are on different origins, CORS and additional configuration increase.
Additionally, multiple instances would cause state conflicts.

## Decision

The Daemon binds to `127.0.0.1`.
The Daemon is a single instance.
In the MVP, the Web UI and API are served from the same origin.

## Considered Options

### Option 1: UI and API as Separate Processes/Origins (Not Adopted)

- Pros: May provide a better development experience in some cases
- Cons: CORS and configuration increase. Overkill for the MVP

### Option 2: Serve from a Single Daemon (Adopted)

- Pros: Minimal configuration. Simple to operate
- Cons: Responsibilities are concentrated in the Daemon

## Rationale

- To reduce operational burden for the MVP
- To create a single control point consistent with DB-as-master (SSoT)

## Consequences

### Positive Impact

- UI startup is simple
- Conflicts are less likely

### Negative Impact

- When the Daemon stops, the UI also stops

## Related Documents

- [Local Daemon (Startup/Shutdown)](../03-details/daemon.md) - Startup/Shutdown
- [API Design](../03-details/api.md) - Base URL
