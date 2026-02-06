---
depends_on:
  - ./summary.md
  - ../02-architecture/principles.md
tags: [overview, goals, problems, differentiation]
ai_summary: "Defines the project goals, list of problems to solve, differentiation points, and success criteria"
---

# Goals and Problems to Solve

> Status: Active
> Last updated: 2026-02-06

This document clarifies the project goals and the problems it aims to solve.

---

## Project Goal

The goal of AgentMine is to serve as an **AI Runner-independent integration management platform** that provides safe scope control, state management based on observable facts, and audit trails.

---

## Problems to Solve

### Problem List

| # | Problem | Impact | Priority |
|---|---------|--------|----------|
| 1 | Unintended changes due to AI runaway | Quality degradation, security incidents | High |
| 2 | State inconsistency and conflicts in parallel work | Unclear progress, conflicts, rework | High |
| 3 | Vendor lock-in to a specific AI Runner | Inability to switch tools, unable to optimize costs | High |
| 4 | Lack of transparency in decision rationale | Reduced reproducibility, inability to audit | Medium |
| 5 | Insufficient visibility into execution status | Cannot stop, delayed intervention | Medium |
| 6 | Degradation of memory quality | Accumulation of incorrect learnings, long-term quality decline | Medium |

### Problem Details

#### Problem 1: Unintended Changes Due to AI Runaway

| Item | Description |
|------|-------------|
| Current state | AI rewrites broad areas, introducing unintended changes |
| Issue | Safety cannot be guaranteed, increasing the human review burden |
| Solution | Physically constrain through per-task scope (write/exclude) and worktrees |

#### Problem 2: State Inconsistency and Conflicts in Parallel Work

| Item | Description |
|------|-------------|
| Current state | When multiple AIs execute simultaneously, state becomes distributed and tracking is difficult. Conflicts on the same files also occur |
| Issue | Task progress is unclear and conflicts increase |
| Solution | Centralize state management with DB as master. Detect write_scope overlaps in advance to avoid conflicts |

#### Problem 3: Vendor Lock-In to a Specific AI Runner

| Item | Description |
|------|-------------|
| Current state | AI development tools like Claude Code, Codex, etc. are vendor-specific |
| Issue | Cannot select Runners based on task characteristics. Cost optimization is also impossible |
| Solution | Absorb differences through RunnerAdapter and manage multiple Runners in a unified manner |

#### Problem 4: Lack of Transparency in Decision Rationale

| Item | Description |
|------|-------------|
| Current state | AI reports and subjective assessments get mixed in, causing inconsistent decisions |
| Issue | Conclusions vary even under the same conditions, reducing reproducibility. Cannot demonstrate rationale during audits |
| Solution | Record observable facts. Automatically generate a Proof Bundle upon Run completion |

#### Problem 5: Insufficient Visibility into Execution Status

| Item | Description |
|------|-------------|
| Current state | Running AI in terminals causes execution status to be scattered |
| Issue | Stopping, re-executing, and intervening in long-running executions is delayed |
| Solution | Consolidate run logs and state in the Web UI, enabling intervention via stop/retry/continue |

#### Problem 6: Degradation of Memory Quality

| Item | Description |
|------|-------------|
| Current state | Memories learned from AI execution keep growing, with old/incorrect information mixed in |
| Issue | Injection of incorrect memories degrades Worker output quality |
| Solution | Add trust scores, expiration dates, and approvals to memories, applying governance |

---

## Success Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| Safety | Number of undetected out-of-scope changes | 0 |
| Reproducibility | Match rate of state determination under identical conditions | 100% |
| Visibility | Trackability rate for tasks/runs | 100% |
| AI Independence | Support for 2+ types of Runners | Claude + 1 or more |
| Conflict Avoidance | Number of parallel conflicts due to write_scope overlap | 0 |

---

## Non-Goals

The following are not goals of this project:

| Non-Goal | Reason |
|----------|--------|
| A system where AI makes final decisions | Decisions are delegated to humans / upper AI layers |
| Fully automated development by a single AI | Maintain role separation and review prerequisites |
| Optimization for a specific AI Runner | AI independence is the principle. Runner-specific optimization is encapsulated within Adapters |
| UI/UX optimization | MVP prioritizes functional completeness |
| Replacing Git | Coexist with Git as a prerequisite |

---

## Related Documents

- [summary.md](./summary.md) - Project overview
- [scope.md](./scope.md) - Scope and out-of-scope
- [principles.md](../02-architecture/principles.md) - Design principles
- [ADR-0013](../04-decisions/0013-repositioning.md) - Repositioning decision record
