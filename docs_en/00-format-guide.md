---
depends_on:
  - ./00-writing-guide.md
tags: [governance, format, structure, metadata]
ai_summary: "Defines formatting standards for document structure, length limits, metadata, diagrams, naming conventions, and cross-references"
---

# Formatting Standards

> Status: Active
> Last updated: 2026-02-01

This document defines the rules for document structure and formatting. For writing style guidelines, see the [Writing Standards](./00-writing-guide.md).

---

## Structure Standards

### Heading Hierarchy

Headings must follow a strict order. Never skip levels.

```
# H1 - Document title (only one per file)
## H2 - Major section
### H3 - Subsection
#### H4 - Detail item (only when necessary)
```

### One File, One Responsibility

Each document covers a single topic. Do not mix multiple topics in one file.

### Identification by Heading

The heading text itself serves as the identifier. Do not assign separate IDs or numbers.

- Write heading names that are unique and specific (avoid generic names like "Overview" or "Details")
- Use Markdown anchors for cross-references: `[User Registration Flow](./flows.md#user-registration-flow)`
- Add a row number column (`#`) only when enumerating items in tables
- Domain-specific prefix IDs (e.g., `F001`, `S001`) are permitted when cross-referencing between tables and section headings

### Use of Tables

Use tables for comparisons and listings. Prefer tables over bullet lists.

---

## Length Guidelines

| Level                  | Limit          | Action When Exceeded                       |
| ---------------------- | -------------- | ------------------------------------------ |
| Single sentence        | ~60 characters | Split it                                   |
| Single paragraph       | 3-5 sentences  | Break into separate paragraphs             |
| Single section (H2)    | 50 lines       | Split into subsections (H3)                |
| Single file            | 200 lines      | Split into separate files with cross-links |
| Single table           | 15 rows        | Split tables by category                   |
| Single Mermaid diagram | 15 nodes       | Split into overview and detail diagrams    |

### Splitting Principles

- When splitting files, leave navigation links in the parent file
- Include references back to the original file in split-off files
- When splitting tables, separate them with category headings (H3/H4)

---

## Cross-Reference Standards

### Link Format

Use relative paths:

```markdown
[Title of Reference](../path/to/file.md)
```

### Related Documents Section

Place a "Related Documents" section at the end of each file, listing links with a one-sentence summary of each.

```markdown
## Related Documents

- [Data Model](../03-details/data-model.md) - Entity definitions and ER diagram
- [API Endpoints](../03-details/api.md) - REST API specifications
```

---

## Metadata Standards

### YAML Front Matter (Machine-Readable)

Include YAML Front Matter at the beginning of each document. This is used for metadata extraction by AI and tools.

| Field        | Required | Description                                                                                       |
| ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `depends_on` | Optional | List of file paths that this document depends on                                                  |
| `tags`       | Optional | Tags for search and classification                                                                |
| `ai_summary` | Required | One-sentence summary of the file contents (enables AI to assess content without opening the file) |

### Status Display (Human-Readable)

Display a human-readable status in a blockquote immediately after the YAML Front Matter.

| Status         | Meaning                                            |
| -------------- | -------------------------------------------------- |
| **Draft**      | Work in progress. Content is incomplete            |
| **Active**     | Valid. Reflects the current design                 |
| **Deprecated** | Not recommended. Retained as reference information |

ADRs (Architecture Decision Records) have their own status vocabulary: **Proposed** / **Accepted** / **Deprecated** / **Superseded**. See the [ADR Template](./04-decisions/0001-template.md) for details.

### Last Updated Date

Include the date in the format `Last updated: YYYY-MM-DD` within the same blockquote as the status. Use the placeholder `YYYY-MM-DD` in template files. Replace with the actual date when using in a real project.

### Complete Document Header

```markdown
---
depends_on:
  - ../path/to/dependency.md
tags: [category1, category2]
ai_summary: "One-sentence summary of this document's contents"
---

# Title

> Status: Draft | Active | Deprecated
> Last updated: YYYY-MM-DD

Summary text (1-2 sentences)
```

---

## Diagram Standards

### Tools

Use **Mermaid only**. Do not use external tools (draw.io, Figma, etc.).

Reasons:

- Text-based, enabling Git diffs
- Readable and writable by AI
- No additional tool installation required

### Diagram Types and Usage

| Diagram Type     | Mermaid Syntax             | Usage                            |
| ---------------- | -------------------------- | -------------------------------- |
| Flowchart        | `flowchart`                | Process flows, state transitions |
| ER Diagram       | `erDiagram`                | Data models                      |
| Sequence Diagram | `sequenceDiagram`          | Inter-component communication    |
| C4 Diagram       | `C4Context`, `C4Container` | System architecture              |
| Class Diagram    | `classDiagram`             | Structural relationships         |

### Diagram Rules

- Every diagram must have a title (heading or caption)
- Include explanatory text before and after diagrams (never leave a diagram standing alone)
- Split complex diagrams into smaller ones

---

## File Naming Conventions

### Design Documents

Numbered directories + kebab-case English filenames:

```
docs/01-overview/summary.md
docs/02-architecture/context.md
```

### ADR (Architecture Decision Record)

4-digit number + kebab-case:

```
04-decisions/0001-template.md
04-decisions/0002-use-typescript.md
```

### GitHub Standard Files

No numbering, uppercase. Exempt from these standards:

```
README.md, LICENSE, CONTRIBUTING.md, CHANGELOG.md
```

---

## Related Documents

- [Writing Standards](./00-writing-guide.md) - Writing style rules
- [Git Standards](./00-git-guide.md) - Commit messages, branch naming, and change history management
- [Document Index](./00-index.md) - Navigation for the entire documentation
