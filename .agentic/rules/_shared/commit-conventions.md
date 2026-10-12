---
name: commit-conventions
description: Conventional Commits format for all commits in this monorepo
globs: ["**/*"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Commit message conventions

This repo uses **Conventional Commits**. Format:

```
<type>(<scope>): <short imperative summary>

[optional body]

[optional footer(s)]
```

## Types

| Type | When to use |
|---|---|
| `feat` | New user-visible feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't change behavior |
| `docs` | Documentation only |
| `test` | Adding or modifying tests |
| `chore` | Tooling, deps, config (non-code) |
| `style` | Formatting, no logic change |
| `ci` | CI/CD config changes |
| `perf` | Performance improvement |
| `build` | Build system or external dependency changes |

## Scope

Optional but encouraged. Use the package or domain name:

```
feat(backend): add stop-sequence mutation
fix(frontend): correct token refresh race
refactor(mobile): extract themed-text variants
chore(iaac): bump terraform provider versions
```

## Summary line

- Imperative mood ("add", not "added" or "adds")
- Lowercase
- No trailing period
- Aim for ≤72 chars

## Body

Use for the **why**, not the what. The diff already shows what changed.

## Footers / trailers

- `Refs: PROJ-123` — link to Jira ticket (always include for feature/fix work)
- `BREAKING CHANGE: <description>` — for backwards-incompatible changes
- `Co-Authored-By: Name <email>` — when pairing or AI-assisted

## Examples

```
feat(backend): add POST /sequences/:id/stop mutation

Marks all Scheduled emails as Stopped and prevents further sends.
The mutation is idempotent — calling on an already-stopped sequence
returns 409.

Refs: CLA-451
```

```
fix(frontend): prevent double token refresh on concurrent 401s

The errorLink was triggering parallel refresh calls when multiple
queries hit 401 simultaneously. Adds a shared isRefreshing flag
and pending-request queue.

Refs: CLA-512
```

```
chore: bump pnpm to 9.15.0 in mise.toml
```

## What NOT to do

- ❌ `update stuff` — no type, vague
- ❌ `feat: WIP` — incomplete work doesn't get its own commit; use a draft branch
- ❌ `fix: fixed the bug` — past tense, no context, no ticket reference
- ❌ Mixing unrelated changes in one commit — split them
