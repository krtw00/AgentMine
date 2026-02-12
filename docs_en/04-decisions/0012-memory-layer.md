---
depends_on:
  - ../02-architecture/principles.md
  - ../03-details/memory-layer.md
tags: [decisions, adr, memory, learning]
ai_summary: "Decision record for introducing the Memory Layer. Background and design decisions for Mem0/Agent Lightning integration"
---

# ADR-0012: Introduction of the Memory Layer

> Status: Accepted
> Last updated: 2026-02-05

## Context

AgentMine determines state based on "observable facts," but the following challenges exist:

1. **Repeating the same failures**: Workers start from a "blank slate" each time and do not learn from past failure patterns
2. **Discontinuity of project knowledge**: Implicit knowledge such as "this project uses pnpm" is not communicated
3. **Integration with reinforcement learning**: There is no foundation to leverage learning results from Agent Lightning, etc.

External tools (Mem0, Supermemory, etc.) enable persistence and reuse of context, and integrating them into AgentMine can resolve the above challenges.

## Decision

Introduce a project-level "Memory Layer."

1. Add a `project_memories` table to the DB
2. Provide CRUD APIs for memories
3. Add a `Memories` section to prompt-composition
4. In the future, integrate with Agent Lightning to automatically generate memories

## Considered Options

### Option 1: Add a Memory Table to the DB (Adopted)

| Item     | Details                                                                             |
| -------- | ----------------------------------------------------------------------------------- |
| Overview | Add a project_memories table and reference it in prompt-composition                 |
| Pros     | Consistent with the DB-as-master principle; minimal impact on existing architecture |
| Cons     | Memory search and matching logic must be implemented in-house                       |

### Option 2: Integrate Mem0 Directly

| Item     | Details                                                                           |
| -------- | --------------------------------------------------------------------------------- |
| Overview | Directly call the Mem0 API, delegating memory storage and search                  |
| Pros     | Advanced memory compression and search capabilities available out of the box      |
| Cons     | Increases external dependency; difficult to align with the DB-as-master principle |

### Option 3: Extend the Settings Table

| Item     | Details                                                                   |
| -------- | ------------------------------------------------------------------------- |
| Overview | Store memories in the existing settings table                             |
| Pros     | Minimal schema changes                                                    |
| Cons     | Difficult to represent memory-specific attributes (type/source/relevance) |

## Rationale

**Option 1 (Add a memory table to the DB)** was adopted for the following reasons:

- **Consistency with the DB-as-master principle**: Maintains the principle of consolidating all state in the DB
- **Incremental extensibility**: Start with manual registration first, then add Agent Lightning integration later
- **Minimal impact on existing architecture**: Only requires adding one section to prompt-composition
- **No external dependencies**: References the Mem0 concept but avoids dependency through in-house implementation

## Consequences

### Positive Impact

- Workers can reference past learnings, reducing repeated failures
- Project-specific knowledge is accumulated and shared
- A foundation is established for incorporating learning results from Agent Lightning, etc.

### Negative Impact

- Implementation of memory selection logic (which memories to include in the prompt) is required
- Handling token limits when memories grow too large is necessary
- Memory quality management (cleaning up old/incorrect memories) may become an operational challenge

## Related ADRs

- [ADR-0003](./0003-local-daemon-and-web-ui.md) - Web UI + Local Daemon
- [ADR-0009](./0009-runner-adapter-interface.md) - RunnerAdapter I/F

## Related Documents

- [Memory Layer](../03-details/memory-layer.md) - Detailed design
- [Prompt Composition](../03-details/prompt-composition.md) - Integration of the Memories section
- [Design Principles](../02-architecture/principles.md) - DB-as-master principle
