---
depends_on:
  - ./principles.md
  - ./structure.md
  - ../03-details/daemon.md
  - ../03-details/event-stream.md
  - ../03-details/log-storage.md
tags: [architecture, nfr, quality-attributes]
ai_summary: "Defines non-functional requirements for the MVP (security, reliability, performance, operability, maintainability, portability)"
---

# Non-Functional Requirements

> Status: Draft
> Last updated: 2026-02-01

This document defines the non-functional requirements for the AgentMine MVP.
This project assumes "local single-user operation" and does not target multi-user usage over a network.

---

## Assumptions

| Item                  | Assumption                                     |
| --------------------- | ---------------------------------------------- |
| Execution Environment | Developer PC (macOS/Linux expected)            |
| Startup Mode          | Local Daemon running on localhost + browser UI |
| State Management      | DB is the SSoT (source of truth for state)     |
| Auditing              | Run/check outputs are stored as logs           |

---

## Security & Privacy

|       # | Requirement               | Details                                                     |
| ------: | ------------------------- | ----------------------------------------------------------- |
| NFR-001 | Local-only exposure       | Daemon binds only to localhost                              |
| NFR-002 | Single instance           | Cannot run multiple instances in the same user environment  |
| NFR-003 | Least privilege execution | Does not require root privileges                            |
| NFR-004 | No persistent secrets     | API keys and other secrets are not stored in DB/logs        |
| NFR-005 | Same-origin UI/API        | Does not assume cross-origin communication (no CORS needed) |

Note:

- This MVP treats "same PC, same user" as the trust boundary. It does not provide a complete defense perimeter.

---

## Reliability & Consistency

|       # | Requirement                | Details                                                                            |
| ------: | -------------------------- | ---------------------------------------------------------------------------------- |
| NFR-010 | DB consistency             | State updates ensure consistency through DB transactions                           |
| NFR-011 | Recovery on restart        | Performs consistency recovery for in-progress runs after restart                   |
| NFR-012 | Auditability               | Run inputs/outputs are stored in a traceable format                                |
| NFR-013 | Events are reconstructable | State can be rebuilt from DB even after temporary UI disconnection                 |
| NFR-014 | Failure observability      | Failures (startup failure, stop, abnormal termination) are observable with reasons |

---

## Performance & Scalability

|       # | Requirement            | Details                                                                       |
| ------: | ---------------------- | ----------------------------------------------------------------------------- |
| NFR-020 | UI responsiveness      | Normal operations should feel responsive without perceived delay              |
| NFR-021 | Streaming log delivery | Execution output can be viewed in near real-time                              |
| NFR-022 | Large log tolerance    | Browsing remains functional even for long-running runs (via pagination, etc.) |
| NFR-023 | Multi-task operation   | List views remain functional as tasks/runs grow in number                     |

---

## Operability & Maintainability

|       # | Requirement      | Details                                          |
| ------: | ---------------- | ------------------------------------------------ |
| NFR-030 | Clear start/stop | Daemon can be easily stopped and restarted       |
| NFR-031 | Easy backup      | Backup is as simple as copying the DB and logs   |
| NFR-032 | Log cleanup      | Logs can be deleted through explicit operations  |
| NFR-033 | Swappable Runner | Runner differences are absorbed by RunnerAdapter |

---

## Portability

|       # | Requirement                 | Details                                                                  |
| ------: | --------------------------- | ------------------------------------------------------------------------ |
| NFR-040 | Major OS support            | MVP targets macOS/Linux                                                  |
| NFR-041 | Documented path assumptions | File layout (AgentMine Home, etc.) is fixed as part of the specification |

---

## Related Documents

- [Design Principles](./principles.md) - DB as truth, observable facts, reproducibility first
- [Major Component Structure](./structure.md) - Daemon/UI/Runner separation
- [Local Daemon](../03-details/daemon.md) - Single instance and consistency recovery
- [Event Delivery](../03-details/event-stream.md) - SSE
- [Log Storage](../03-details/log-storage.md) - Log retention and access
