---
depends_on:
  - ./0004-agentmine-home-dir.md
tags: [decisions, adr, logs, storage]
ai_summary: "Decides to store logs as files under ~/.agentmine/logs rather than in the DB"
---

# ADR-0008: Logs Are Stored as Files

> Status: Accepted
> Last updated: 2026-02-01

## Context

Run and check outputs are needed for auditing and debugging.
However, storing logs in the DB tends to bloat the database.
Since the MVP is local single-user operation, the operational cost of file storage is low.

## Decision

Logs are stored as files under the AgentMine Home directory.
The DB holds references (log_ref/output_ref).

## Considered Options

### Option 1: Store in DB (Not Adopted)

- Pros: Easy to search collectively
- Cons: DB bloats. Backups become heavy

### Option 2: Do Not Store (Not Adopted)

- Pros: Minimal implementation
- Cons: Auditing and reproducibility are not achievable

### Option 3: Store as Files (Adopted)

- Pros: Prevents DB bloat. Appending is simple
- Cons: Operations for referencing and deletion are required

## Rationale

- To retain facts (logs) on a per-run basis
- To offload logs to separate storage while maintaining the DB-as-master principle

## Consequences

### Positive Impact

- Low cost of log storage
- Easier to avoid DB performance degradation

### Negative Impact

- A log retention and deletion policy is required

## Related Documents

- [ADR-0004](./0004-agentmine-home-dir.md) - `~/.agentmine`
- [Log Storage](../03-details/log-storage.md) - Storage location and references
