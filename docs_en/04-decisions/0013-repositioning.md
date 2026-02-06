---
depends_on:
  - ../02-architecture/principles.md
  - ../04-decisions/0009-runner-adapter-interface.md
  - ../03-details/scope-control.md
tags: [decisions, adr, repositioning, strategy, differentiation]
ai_summary: "Repositioning decision in response to Claude Code Agent Teams. Shifting to AI-agnostic + safety/auditing + team-oriented"
---

# ADR-0013: Repositioning (AI-Agnostic, Safety, Team-Oriented)

> Status: Accepted
> Last updated: 2026-02-06

## Context

In February 2026, Anthropic announced the **Agent Teams** feature for Claude Code alongside Claude Opus 4.6. Agent Teams is a mechanism for running multiple Claude Code instances in parallel with autonomous coordination.

The "AI parallel orchestration" that AgentMine has been providing overlaps with a native feature of Claude Code. Continuing development along the same track cannot compete with Claude Code's ecosystem advantage.

Upon reviewing AgentMine's existing design, several strengths **not present in Claude Code** were identified.

| AgentMine's Existing Assets | Claude Code's Equivalent |
|---|---|
| RunnerAdapter (AI-agnostic) | Claude-only |
| write_scope + scope violation + approval workflow | Tool-level permission modes only |
| Worktree physical isolation | Operates in the same directory |
| Observable Facts + state derivation | Relies on AI self-reporting |
| DoD (definition-based completion verification) | No formal completion definition |
| Web UI (monitoring, intervention, sharing) | Terminal-only |

## Decision

AgentMine's direction is redefined along the following three axes.

### A. AI-Agnostic Orchestration

With the RunnerAdapter design at its core, AgentMine becomes a platform that integrates and manages multiple AI Runners such as Claude/Codex/Gemini. Claude Code is positioned as one "excellent Runner."

### B. Safety and Auditing Layer

Scope control, DoD, Observable Facts, and violation tracking are strengthened to provide safety and auditability for AI execution. Specific additional features:

| Feature | Overview |
|---|---|
| Proof-Carrying Run | Automatically generates an evidence pack of changes at run completion (prompt hash, scope snapshot, changed files, DoD results, approval history) |
| Conflict-Aware Scheduler | Detects write_scope overlaps before parallel execution and determines an execution order that avoids conflicts |
| Memory Governance | Adds trust scores, expiration dates, and approvals to memories to prevent memory contamination |

### D. Team/Organization-Oriented (Phase 3)

Authentication and authorization management are added to support shared team usage. Leveraging Web UI visibility, this provides organizational operations that cannot be achieved with Claude Code's "personal terminal."

## Evaluation of Adopted Additional Features

| # | Feature | Phase | Consistency with Existing Design | Differentiation Impact |
|---|---------|-------|----------------------------------|----------------------|
| F | Proof-Carrying Run | 1 | scope_snapshot, dod_snapshot, log_ref, etc. already exist. Only bundling needed | Medium-High |
| G | Conflict-Aware Scheduler | 1 | Natural extension of write_scope requirement (ADR-0006) | High |
| K | Memory Governance | 1 | Already noted as future extension in memory-layer.md | Medium |
| I | Cost/SLA Router | 2 | Intelligent extension of agent_profiles runner/model selection | High |
| L | Compliance Templates | 2-3 | Achievable through combination of settings + scope + DoD | Medium-High |

## Deferred/Rejected Features

| # | Feature | Verdict | Reason |
|---|---------|---------|--------|
| E | Just-in-Time Scope | Deferred | Conflicts with non-interactive Runner (ADR-0005). Can be approximated through the existing retry flow |
| H | Spec Contract Mode | Rejected | Requires code semantic analysis, which is outside the scope of the current architecture |
| J | Forensic Replay | Deferred | Low priority. Partially addressable through the reproducibility principle |

## Considered Options

### Option 1: Compete on the Same Track as Claude Code (Not Adopted)

| Item | Details |
|------|---------|
| Overview | Continue expanding orchestration features as-is |
| Pros | No cost of direction change |
| Cons | Cannot compete with Claude Code's ecosystem and user base |

### Option 2: Pivot to AI-Agnostic + Safety + Team-Oriented (Adopted)

| Item | Details |
|------|---------|
| Overview | Focus on strengths that Claude Code does not have |
| Pros | Clear differentiation; leverages existing design assets |
| Cons | Documentation update costs associated with repositioning |

### Option 3: Specialize as a Claude Code Complementary Tool

| Item | Details |
|------|---------|
| Overview | Specialize as a management layer exclusively for Claude Code |
| Pros | Can directly capture Claude Code users |
| Cons | Becomes dependent on Claude Code, losing the AI-agnostic advantage |

## Rationale

**Option 2** was adopted for the following reasons:

- Existing design (RunnerAdapter, scope-control, DoD, Observable Facts) does not conflict with the new direction
- Zero changes to implemented code. Can be addressed through documentation updates and completion of unimplemented parts
- Aligns with the multi-model trend in the AI market
- Can build a "complementary" rather than "competitive" relationship with Claude Code

## Consequences

### Positive Impact

- Differentiation from Claude Code becomes clear
- Existing design assets are utilized without waste
- Enterprise market appeal becomes possible

### Negative Impact

- Documentation-wide updates are required
- Implementation and testing burden for multi-Runner support increases
- Team-oriented features (authentication, authorization) require new design

## Related ADRs

- [ADR-0006](./0006-task-write-scope-required.md) - write_scope requirement (prerequisite for Conflict-Aware Scheduler)
- [ADR-0009](./0009-runner-adapter-interface.md) - RunnerAdapter I/F (foundation for AI-agnostic approach)
- [ADR-0012](./0012-memory-layer.md) - Memory Layer (prerequisite for Memory Governance)

## Related Documents

- [Project Overview](../01-overview/summary.md) - Target for repositioning updates
- [Scope](../01-overview/scope.md) - Target for phase plan restructuring
- [Scope Control](../03-details/scope-control.md) - Existing safety layer design
- [RunnerAdapter](../03-details/runner-adapter.md) - AI-agnostic foundation design
