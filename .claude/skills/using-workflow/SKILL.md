---
name: using-workflow
description: Meta-skill that enforces the spec-driven workflow. Auto-loaded by SessionStart. If a state file exists for the active branch, the driver `/work` is the only correct entry point unless the dev explicitly opts into a standalone skill.
---

# Using the Spec-Driven Workflow

**You are in a repo with an automated, ordered workflow. This skill enforces correct usage. Read this every session.**

> **Evidence discipline.** When you state the active ticket / phase / branch, copy it from the actual state file + `git rev-parse --abbrev-ref HEAD` output — never from memory of an earlier turn.

## Core principle

Tickets move through a defined sequence: `start → plan → plan-review (human) → implement-plan → verify → open-mr`. The dev does NOT pick which sub-skill to invoke; **the driver skill `/work` reads the state and dispatches automatically.**

## Decision tree on every dev request

```
1. Is there an active ticket state file?
   → `ls .claude/state/*.json | head` — if any exist, there's active work.

2. Is the dev working on a feature branch (feat/PROJ-* | fix/PROJ-* | ...)?
   → git rev-parse --abbrev-ref HEAD

3. Are they asking to make code changes related to the active ticket?
   → If YES → ALWAYS use the /work driver.
   → If NO  → see "Standalone mode" below.
```

## When to call `/work`

**Default for all ticket-related work.** The dev says:

- "Let's start PROJ-123" → `/work PROJ-123`
- "What's next?" / "Continue" / "Move on" → `/work`
- "Implement the next task" → `/work` (don't bypass to `/implement-plan` directly)
- "Run the checks" → `/work` (don't bypass to `/verify` directly)
- "Open the MR" → `/work` (don't bypass to `/open-mr` directly)

## When standalone skills are OK

Only when the dev's intent is clearly NOT to advance the workflow:

| Dev says | Use |
|---|---|
| "Brainstorm options for X" | `/brainstorm` (standalone — no state change) |
| "Debug this stack trace" | `/debug` (standalone) |
| "Where in the codebase does X live?" | `/explore` (standalone, read-only) |
| "Check if PROJ-456 is ready for dev" (different ticket) | `/lint-ticket PROJ-456` (standalone) |
| "Re-run verify on the current branch" (re-check, not advance) | `/verify --standalone` (makes NO state changes — reports to `/tmp/verify-<timestamp>/`; see verify/SKILL.md §Standalone mode) |

If the dev's intent is ambiguous, ask: *"Should this advance the current workflow on PROJ-123 (use /work), or is this a one-off (use /brainstorm)?"*

## When the dev explicitly opts out

The dev can override: *"Skip the workflow, just edit this file."* You then make the change without going through `/work`. **Warn once** that they're going off-flow and won't get verification, then comply.

## Anti-patterns

| ❌ Don't | ✅ Do |
|---|---|
| Run `/plan` directly during `implementing` phase | Run `/work` — it advances per state |
| Make commits during `verifying` if verifier hasn't run | Run `/work` — verify gates the commit |
| Open a PR with `gh pr create` outside `/open-mr` | Run `/work` — open-mr handles it |
| Update the state file by hand | Let the skills update it (they own the schema) |
| Skip `/work` because "I know what's next" | Even if you know, `/work` ensures hooks fire and state is consistent |

## Reading the state

State lives at `.claude/state/<ticket>.json`:

```json
{
  "ticket": "PROJ-123",
  "phase": "implementing",
  "branch": "feat/PROJ-123-stop-sequence-button",
  "plan": ".agentic/plans/PROJ-123.md",
  "current_task": "t3",
  ...
}
```

If multiple state files exist (multiple in-flight tickets), match by branch:

```bash
git rev-parse --abbrev-ref HEAD       # e.g., feat/PROJ-123-stop-sequence-button
# Find state file whose 'branch' field matches
```

## Important — session start

The SessionStart hook injects this skill content. If you see a "[workflow] active ticket: PROJ-123 (phase: implementing)" notice in your context, that's authoritative — the dev expects `/work` to continue from there.

If no active ticket is detected, the SessionStart message will say so; only then is it safe to start fresh with `/work TICKET`.

## Pre-existing skills (Superpowers)

This workflow may invoke Superpowers primitives internally:

- `superpowers:brainstorming` — used by `/brainstorm` and during `/start` if ticket has open questions
- `superpowers:writing-plans` — used by `/plan` as a building block
- `superpowers:subagent-driven-development` — used by `/implement-plan` for fresh-context per task
- `superpowers:test-driven-development` — enforced inside `/implement-plan`
- `superpowers:verification-before-completion` — used as the evidence gate before `/open-mr`
- `superpowers:systematic-debugging` — used by `/debug` standalone

Don't call them directly from a dev request — call our skills, which compose them.

## Summary rule

> If the dev's intent is to move a ticket forward → **`/work`**.
> If the dev's intent is exploratory, debugging, or off-flow → standalone skill.
> If unclear → **ask**, default to `/work`.
