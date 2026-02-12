---
depends_on:
  - ../03-details/ui-mvp.md
  - ../03-details/daemon.md
  - ../03-details/api.md
  - ./0003-local-daemon-and-web-ui.md
  - ./0007-event-stream-uses-sse.md
tags: [decisions, adr, ui, daemon, deployment]
ai_summary: "Adopts a hybrid approach: separated UI dev server for development, and Daemon serving UI+API+SSE from the same origin in production"
---

# ADR-0011: UI Serving Adopts a Hybrid Approach (Separated in Development + Same Process in Production)

> Status: Accepted
> Last updated: 2026-02-01

## Context

The MVP starts with local single-user operation.
The Web UI provides monitoring and intervention, while the Local Daemon serves as the execution platform.

Meanwhile, the Web UI involves extensive trial and error during implementation, and we want fast iteration with HMR, etc. during development.
However, a two-process configuration of "UI server + Daemon" in production makes startup procedures and connectivity (CORS, etc.) complex.

## Decision

The UI serving approach is hybrid.

- In production (operations), the Daemon serves the Web UI (single process)
- API and SSE are provided by the Daemon, on the same origin as the Web UI (`/api/*` and `/api/events`)
- The Web UI references API/SSE via relative paths (`/api/...`). The UI does not contain Daemon host/port configuration
- During development, the Web UI may be started on a separate port using a dev server. The dev server proxies `/api/*` and `/api/events` to the Daemon

## Considered Options

### Option 1: Daemon Always Serves the UI (Not Adopted)

| Item     | Details                                                                |
| -------- | ---------------------------------------------------------------------- |
| Overview | The Daemon serves the UI in both development and production            |
| Pros     | Simple with a single URL/origin. No CORS needed                        |
| Cons     | Slow iteration during UI development. Requires building and re-serving |

### Option 2: UI and Daemon Always Separated (Not Adopted)

| Item     | Details                                                                   |
| -------- | ------------------------------------------------------------------------- |
| Overview | UI server and Daemon always run as separate processes/ports               |
| Pros     | Fast UI development (HMR, etc.)                                           |
| Cons     | Two-process operation. Requires CORS, proxy, and compatibility management |

### Option 3: Hybrid (Adopted)

| Item     | Details                                                        |
| -------- | -------------------------------------------------------------- |
| Overview | Daemon serves in production; dev server + proxy in development |
| Pros     | Balances operational simplicity with development speed         |
| Cons     | Dev server proxy configuration is required                     |

## Rationale

- To prioritize single-process/single-URL startup in production
- To ensure fast UI development iteration (HMR, etc.)
- To fix the UI's API references to relative paths, avoiding CORS and configuration branching

## Consequences

### Positive Impact

- In production, starting the Daemon alone makes UI/API/SSE available
- The Web UI uses the same API paths in both production and development
- UI development can iterate quickly with a dev server

### Negative Impact

- A mechanism for the Daemon to serve UI build artifacts is required
- The dev server proxy configuration becomes an additional component

## Related ADRs

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon
- [ADR-0007](./0007-event-stream-uses-sse.md) - Event delivery uses SSE
