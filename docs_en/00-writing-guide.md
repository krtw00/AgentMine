---
depends_on: []
tags: [governance, style-guide, text-quality]
ai_summary: "Defines writing standards covering quality, self-containment, redundancy, and terminology"
---

# Writing Standards

> Status: Active
> Last updated: 2026-02-01

This document defines the rules for writing style. For document structure and formatting, see the [Formatting Standards](./00-format-guide.md).

---

## Scope of Application

These standards (Writing Standards, Formatting Standards, and Git Standards) apply to files under the `docs/` directory.

| File           | Applies | Notes                                                               |
| -------------- | :-----: | ------------------------------------------------------------------- |
| `docs/**/*.md` |   Yes   | All rules apply                                                     |
| `README.md`    | Partial | Only text quality rules apply. Front Matter and status not required |
| `DESIGN.md`    | Partial | Only text quality rules apply. Front Matter and status not required |
| `CHANGELOG.md` |   No    | Follows Keep a Changelog format                                     |
| `.github/**`   |   No    | Follows GitHub standard format                                      |

---

## Core Principles

| Principle                  | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| **No code**                | Design documents must not contain code                   |
| **Active use of diagrams** | Visualize with Mermaid syntax. Do not rely on text alone |
| **What/Why first**         | Write "what" and "why." Do not write "how to implement"  |

### Exceptions to Code Prohibition

Code snippets of 1-2 lines are permitted only in the following cases:

- Configuration file examples (e.g., `.env` format)
- Command execution examples (e.g., `npm install`)
- File path examples
- Syntax examples within standards documents

---

## Text Quality Standards

### One Sentence, One Piece of Information

Do not pack multiple pieces of information into a single sentence. Separate sentences by information unit.

**NG:** The user enters an email address and password on the login screen, and upon successful authentication, is redirected to the dashboard.

**OK:** The user enters an email address and password on the login screen. Upon successful authentication, the user is redirected to the dashboard.

### Explicit Subjects

Do not omit subjects. Clearly state who or what performs the action.

### Prefer Affirmative Statements

Write "do X" rather than "do not do Y." Use negative forms only when stating prohibitions.

### Controlling Ambiguous Expressions

| Level          | Action                              | Applicable Expressions                                  |
| -------------- | ----------------------------------- | ------------------------------------------------------- |
| **Prohibited** | Do not use                          | "sort of," "make it nice," "appropriately," "as needed" |
| **Caution**    | Provide concrete examples when used | "etc.," "generally," "typically," "mainly"              |
| **Permitted**  | No restrictions                     | "for example," "specifically"                           |

**Using cautionary expressions:**

- NG: `Use an authentication method (such as OAuth)`
- OK: `Choose from authentication methods (OAuth, SAML, API Key, etc.)`

---

## Self-Containment Standards

### Define Abbreviations on First Use

When using an abbreviation for the first time in a file, include the full name.

Example: `ADR (Architecture Decision Record)`

### Eliminate Implicit Knowledge

Write under the assumption that the reader has no prior context. Explicitly state project-specific background and history.

### Summarize When Referencing

When providing a reference link to another file, include a one-sentence summary of that file's contents.

Example: `For details, see the [Data Model](../03-details/data-model.md) (entity definitions and ER diagram).`

---

## Redundancy Standards

### Applying the DRY Principle

| Content                                  | Policy                                                 |
| ---------------------------------------- | ------------------------------------------------------ |
| Summary (one-sentence overview)          | Duplication is permitted (for self-containment)        |
| Details (tables, diagrams, explanations) | Duplication is prohibited. Use reference links instead |

### Eliminate Filler Expressions

Do not write introductory sentences that serve no purpose.

- NG: `Here we will explain the authentication flow. The authentication flow is...`
- OK: `The authentication flow is...`

### Eliminate Decorative Modifiers

Do not use degree adverbs ("very," "extremely," "considerably"). Replace with quantitative expressions.

- NG: `Achieves very high throughput`
- OK: `Achieves throughput of 1000 req/s or higher`

---

## Terminology and Notation Standards

### Use the Glossary

- Define technical terms and project-specific terms in `99-appendix/glossary.md`
- On first use, indicate with: "XX (see glossary)"

### No Notation Inconsistencies

Do not use multiple names for the same concept. Define the official name in the glossary and use it consistently.

### Writing Style

- Use a concise, declarative style (prioritize brevity)
- Avoid overly casual or conversational tone

---

## Related Documents

- [Formatting Standards](./00-format-guide.md) - Document structure, metadata, diagrams, and naming conventions
- [Git Standards](./00-git-guide.md) - Commit messages, branch naming, and change history management
- [Document Index](./00-index.md) - Navigation for the entire documentation
- [Glossary](./99-appendix/glossary.md) - Term definitions
