---
depends_on: []
tags: [decisions, adr, template]
ai_summary: "Template and guidelines for Architecture Decision Records (ADR)"
---

# ADR-0001: ADR Template

> Status: Active
> Last updated: YYYY-MM-DD

This document is the template for Architecture Decision Records (ADR).

---

## Overview

A format for recording important decisions related to architecture and technology.

---

## How to Use ADRs

### When to Write an ADR

- Technology stack selection
- Adoption of architectural patterns
- Selection of important libraries/frameworks
- Major design decisions

### File Naming Convention

```
04-decisions/
├── 0001-adr-template.md
├── 0002-use-typescript.md
├── 0003-adopt-postgresql.md
└── ...
```

---

## Template

Copy the following to create a new ADR.

```markdown
# ADR-NNNN: {Title}

> Status: Proposed | Accepted | Deprecated | Superseded
> Last updated: YYYY-MM-DD

## Context

<!-- Background and circumstances that necessitated the decision -->

{What situation arose and why a decision was needed}

## Decision

<!-- The adopted decision -->

{What was decided}

## Considered Options

### Option 1: {Name}

| Item     | Details         |
| -------- | --------------- |
| Overview | {Description}   |
| Pros     | {Advantages}    |
| Cons     | {Disadvantages} |

### Option 2: {Name}

| Item     | Details         |
| -------- | --------------- |
| Overview | {Description}   |
| Pros     | {Advantages}    |
| Cons     | {Disadvantages} |

## Rationale

<!-- Why that option was chosen -->

Reasons for adopting {Option 1}:

- {Reason 1}
- {Reason 2}
- {Reason 3}

## Consequences

### Positive Impact

- {Positive outcome 1}
- {Positive outcome 2}

### Negative Impact

- {Negative outcome / trade-off 1}
- {Negative outcome / trade-off 2}

## Related ADRs

- [ADR-XXXX](./XXXX-xxx.md) - {Related decision}
```

---

## Status Definitions

| Status         | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| **Proposed**   | Under proposal. Not yet finalized                                                |
| **Accepted**   | Approved. Currently an active decision                                           |
| **Deprecated** | Not recommended. No longer applied to new work, but existing usage is maintained |
| **Superseded** | Replaced by another ADR. Noted as `Superseded by ADR-XXXX`                       |

---

## Related Documents

- [00-writing-guide.md](../00-writing-guide.md) - Writing guidelines
- [tech-stack.md](../02-architecture/tech-stack.md) - Technology stack
