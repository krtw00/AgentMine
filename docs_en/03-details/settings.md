---
depends_on:
  - ./data-model.md
  - ./authorization.md
  - ./definition-of-done.md
  - ./scope-control.md
tags: [details, settings, configuration, schema]
ai_summary: "Defines the Project settings key hierarchy, value schemas, defaults, and change handling (run snapshots)"
---

# Project Settings

> Status: Draft
> Last updated: 2026-02-01

This document defines the design of per-Project settings.
Settings are a mechanism for managing "mutable rules" in the DB.

---

## Purpose

- Allow per-Project customization of DoD, scope defaults, etc.
- Centralize change history reference points in the DB, making it the sole source for UI/API.
- Define a snapshot strategy to prevent settings changes from breaking run interpretation.

---

## Assumptions

| Item    | Policy                                  |
| ------- | --------------------------------------- |
| Scope   | Per-Project (has project_id)            |
| Storage | DB (SSoT for state)                     |
| Format  | `key` + `value(JSON)` pairs             |
| Secrets | Not stored in settings (API keys, etc.) |

---

## Key Hierarchy (Naming Convention)

Setting keys have "dot-separated namespaces."

| Rule          | Content                                                           |
| ------------- | ----------------------------------------------------------------- |
| Format        | `<namespace>.<name>`                                              |
| namespace     | Starts with lowercase letters (e.g., `dod`, `scope`)              |
| name          | Uses lowerCamelCase (e.g., `requiredChecks`)                      |
| Compatibility | Do not change the meaning of existing keys (add new keys instead) |

Note:

- The MVP only handles Project settings. Daemon-wide settings are out of scope.

---

## Keys Used in MVP

### `scope.defaultExclude`

Defines project-wide exclude (inaccessible) paths.
Combined with Agent Profile's `default_exclude` to produce the final exclude (see Scope Control).

| Item    | Content     |
| ------- | ----------- |
| Value   | Glob array  |
| Default | Empty array |

Notes:

- This is the primary setting for preventing personal and sensitive information from being passed to AI. Files can be excluded individually.
- Sensitive files like `.env` should generally be excluded here and handled manually by humans.

### `dod.requiredChecks`

Defines DoD required check definitions (commands, etc.) (see DoD).

| Item    | Content                                                |
| ------- | ------------------------------------------------------ |
| Value   | Check definition array (check_key/label/command, etc.) |
| Default | Undefined (DoD becomes `pending`)                      |

---

## Snapshot Strategy (Reproducibility)

Settings are mutable.
However, if past run evaluations are affected by "current settings," reproducibility breaks.
In the MVP, settings that affect runs are saved as snapshots at run start time.

| Target          | Storage             | Purpose                                       |
| --------------- | ------------------- | --------------------------------------------- |
| Effective scope | runs.scope_snapshot | Violation determination and reproducibility   |
| DoD definition  | runs.dod_snapshot   | Reproducibility of past run DoD determination |

Note:

- Snapshot specifics follow the respective detail documents (Scope Control / DoD).

---

## Change Handling (MVP)

| Item         | Policy                                                                |
| ------------ | --------------------------------------------------------------------- |
| Change actor | Human User (UI operation)                                             |
| Change unit  | Per-key upsert                                                        |
| Impact scope | Applied to subsequent runs. Past runs are interpreted using snapshots |

---

## Related Documents

- [Data Model](./data-model.md) - Settings table
- [Authorization](./authorization.md) - Settings changes are Human-initiated
- [Scope Control](./scope-control.md) - `scope.defaultExclude`
- [DoD (Definition of Done)](./definition-of-done.md) - `dod.requiredChecks`
