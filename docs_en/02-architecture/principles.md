---
depends_on:
  - ../01-overview/summary.md
  - ../01-overview/goals.md
tags: [architecture, principles, philosophy]
ai_summary: "Defines design philosophy including separation of decision-making and execution platform, DB as master, observable facts, and more"
---

# Design Principles (Philosophy SSoT)

> Status: Draft
> Last updated: 2026-02-01

This document is the SSoT that defines the design philosophy and decision criteria for AgentMine.

---

## Core Philosophy

AgentMine serves as
a "non-decision-making execution platform" and a "manager of decision materials."
The decisions themselves are made by humans and upper-layer AI.

---

## Principles

### 1. No Decision-Making

- AgentMine does not make final decisions.
- Decisions are delegated to the Orchestrator/Planner/Supervisor.
- AgentMine focuses on providing decision materials.

### 2. Orchestrator Is an Interface

- The Orchestrator stands at the boundary between humans and AI.
- It handles requirement organization, delegation, and decision-making.
- It owns no deliverables; it is the entry/exit point for decisions.

### 3. DB as Master (Single Source of Truth)

- All state is consolidated in the DB.
- Files are snapshots and not the source of truth.
- This is a prerequisite for enabling sharing and auditing.

### 4. Observable Facts

- State is determined by facts, not by AI reports.
- Examples of facts: exit codes, merge status, logs, verification results.
- This improves decision reproducibility.

### 5. Reproducibility First

- The highest priority is ensuring the same conditions produce the same state.
- Decision materials are fixed; subjectivity is eliminated.
- This improves diff reviews and auditability.

### 6. Safety Through Constraints

- Scope control and worktree isolation prevent runaway behavior.
- Auto-approval is only permitted when physical constraints exist.

### 7. AI-Agnostic (Runner Swappability)

- No dependency on a specific AI.
- Execution methods are swappable as Runner adapters (CLI/API, etc.).
- How observable facts are collected does not depend on the Runner.

### 8. Project Management Is Central

- The system centers on Project/Task/Dependency/Run.
- Progress, history, and dependencies are managed in a unified manner.
- AI operates on top of this management model.

---

## Expected Benefits

| Principle | Expected Benefit |
|-----------|-----------------|
| No Decision-Making | Responsibilities become clear, improving extensibility |
| DB as Master | State becomes consistent and auditable |
| Observable Facts | Reproducibility increases and decisions become stable |
| Safety Through Constraints | Damage from AI runaway behavior is localized |

---

## Non-Principles (What We Don't Do)

| Item | Reason |
|------|--------|
| Judging specification correctness | Business decisions are a human responsibility |
| Fully automated development by a single AI | Would break role separation |
| Prioritizing UI optimization | Platform foundation completion comes first |
| Replacing Git | Coexist with existing workflows |

---

## Related Documents

- [summary.md](../01-overview/summary.md) - Project overview
- [goals.md](../01-overview/goals.md) - Objectives and problems to solve
- [scope.md](../01-overview/scope.md) - Scope and exclusions
- [role-model.md](./role-model.md) - Roles and separation of responsibilities
