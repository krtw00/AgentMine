---
depends_on:
  - ./00-writing-guide.md
tags: [governance, git, workflow]
ai_summary: "Git workflow standards for commit messages, branch naming, and change history management"
---

# Git Standards

> Status: Active
> Last updated: 2026-02-01

This document defines the rules for Git workflows, covering commit messages, branch naming, and change history management.

---

## Commit Message Standards

Follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Element   | Required | Description                                               |
| --------- | -------- | --------------------------------------------------------- |
| `type`    | Required | Type of change                                            |
| `scope`   | Optional | Target module or directory of the change                  |
| `subject` | Required | Summary of the change (50 characters or fewer)            |
| `body`    | Optional | Details and context of the change (wrap at 72 characters) |
| `footer`  | Optional | Breaking changes, issue references                        |

### type List

| type       | Purpose                                         | Included in CHANGELOG |
| ---------- | ----------------------------------------------- | :-------------------: |
| `feat`     | Add a new feature                               |          Yes          |
| `fix`      | Fix a bug                                       |          Yes          |
| `docs`     | Documentation-only changes                      |          No           |
| `style`    | Formatting changes (no behavioral impact)       |          No           |
| `refactor` | Refactoring (no feature additions or bug fixes) |          No           |
| `perf`     | Performance improvements                        |          Yes          |
| `test`     | Add or modify tests                             |          No           |
| `ci`       | CI/CD configuration changes                     |          No           |
| `chore`    | Build, tooling, or dependency changes           |          No           |

### Breaking Changes

For backward-incompatible changes, add `BREAKING CHANGE:` in the footer or append `!` after the type.

```
feat(api)!: change response format for user authentication endpoint

BREAKING CHANGE: user object id type changed from string to UUID
```

### subject (Summary Line) Rules

- Use imperative mood ("add" not "added")
- Do not end with a period
- Keep within 50 characters
- Prioritize "why it was changed" over "what was changed"

### Good and Bad Examples

```
# Good examples
feat(auth): add social login via OAuth 2.0
fix(cart): fix issue where items with quantity 0 could be added to cart
docs(api): add rate limit documentation to endpoint specs
refactor(db): migrate query builder to repository pattern

# Bad examples
fix: bug fix                      # unclear what bug
feat: add various things          # too coarse-grained
update: update file               # non-standard type, unclear content
feat(auth): added OAuth 2.0.      # past tense, trailing period
```

### Commit Granularity

- 1 commit = 1 logical change
- Do not combine multiple unrelated changes in a single commit
- Commit in a working state (never commit with a broken build)

---

## Branch Naming Conventions

### Format

```
<type>/<short-description>
```

Use the same type prefix as commit messages. Write the description in kebab-case.

### Examples

| Branch Name                   | Purpose                          |
| ----------------------------- | -------------------------------- |
| `feat/oauth-login`            | Add OAuth authentication feature |
| `fix/cart-zero-quantity`      | Fix cart zero-quantity bug       |
| `docs/api-rate-limit`         | Add rate limit to API specs      |
| `refactor/repository-pattern` | Migrate to repository pattern    |
| `chore/upgrade-dependencies`  | Upgrade dependency packages      |

### Rules

- Use English kebab-case
- Keep names short and specific (target: 3-5 words)
- When including issue numbers, append them at the end: `fix/cart-zero-quantity-42`
- Direct commits to main branches (`main` / `developer`) are generally prohibited

---

## Branch Strategy

The project adopts a branch strategy based on Git-flow.

### Branch Structure

```
main (production release)
  ^ merge (release only)
developer (development integration)
  ^ PR + review
feature/* / fix/* / ... (working branches)
```

| Branch      | Purpose                                                               | Direct Push |
| ----------- | --------------------------------------------------------------------- | :---------: |
| `main`      | Production releases. Always in a deployable state                     | Prohibited  |
| `developer` | Development integration. Consolidates changes for the next release    | Prohibited  |
| `feature/*` | New feature development. Branched from developer                      |   Allowed   |
| `fix/*`     | Bug fixes. Branched from developer                                    |   Allowed   |
| `hotfix/*`  | Urgent fixes. Branched from main, merged into both main and developer |   Allowed   |
| `release/*` | Release preparation. Branched from developer                          |   Allowed   |

### Development Flow

1. **Start work**: Create a working branch from `developer`

   ```bash
   git checkout developer
   git pull origin developer
   git checkout -b feature/memory-layer
   ```

2. **During work**: Commit on the working branch

   ```bash
   git add .
   git commit -m "feat: implement memory layer API"
   ```

3. **Work complete**: Create a PR to merge into `developer`

   ```bash
   git push -u origin feature/memory-layer
   gh pr create --base developer
   ```

4. **Release**: Merge from `developer` to `main` (release manager only)

### PR Rules

| Rule            | Description                              |
| --------------- | ---------------------------------------- |
| Base branch     | Usually `developer`; `main` for hotfixes |
| Review          | At least 1 approval required             |
| Merge method    | Squash and merge recommended             |
| Branch deletion | Delete the working branch after merge    |

### Exceptions

Direct pushes to `developer` are permitted in the following cases (e.g., during solo development):

- Obvious typo fixes
- Minor CI/CD configuration fixes
- Urgent situations (create a PR afterward to maintain a record)

---

## Change History Management

### Basic Policy

- Regular changes: managed through Git history
- Significant changes: recorded in `CHANGELOG.md`

### Changes Recorded in CHANGELOG

- Breaking changes (commits containing `BREAKING CHANGE`)
- New feature additions (`feat` type commits)
- Significant bug fixes (high-impact `fix` type commits)
- Performance improvements (`perf` type commits)

### CHANGELOG Format

Follow [Keep a Changelog](https://keepachangelog.com/).

```markdown
## [Unreleased]

### Added

- Add social login via OAuth 2.0 (#42)

### Fixed

- Fix issue where items with quantity 0 could be added to cart (#38)

### Changed

- Change response format for user authentication endpoint (breaking change)
```

---

## Related Documents

- [Writing Standards](./00-writing-guide.md) - Writing style rules
- [Formatting Standards](./00-format-guide.md) - Document structure, metadata, diagrams, and naming conventions
- [Document Index](./00-index.md) - Navigation for the entire documentation
