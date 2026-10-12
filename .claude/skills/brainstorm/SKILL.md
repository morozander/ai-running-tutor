---
name: brainstorm
description: Standalone — explore alternatives, weigh trade-offs, refine rough ideas before any ticket exists. Read-only; doesn't touch workflow state. Delegates to superpowers:brainstorming for the actual exploration.
---

# /brainstorm — Off-Flow Exploration

Use when the dev wants to think before there's a ticket — *"How should we approach X?"*, *"What are the trade-offs between Y and Z?"*

> **Evidence discipline.** Brainstorm produces no verifiable artifact, but any concrete claim about the codebase you drop into it (a file exists, "X is already implemented", a cost/latency number) must be backed by a real Read/Grep/command you actually ran — never asserted from memory.

## Inputs

- A topic, question, or rough idea from the dev

## Procedure

### 1. Check state context

If an active state file exists for the current branch:

> Print: "Note: you're on `feat/PROJ-123-stop-sequence-button` (phase: `implementing`). This brainstorm is standalone — it won't change workflow state."

Don't refuse — just inform.

### 2. Delegate to superpowers:brainstorming

Invoke the Superpowers `brainstorming` skill with the dev's topic. It will:

- Ask clarifying questions if scope is fuzzy
- List 2-4 distinct approaches with pros/cons
- Surface non-obvious trade-offs (cost, complexity, future flexibility)
- Identify what would need to be true for each option to be best

If Superpowers isn't installed (no `superpowers:brainstorming` available), fall back to inline brainstorming with the same shape:

1. Restate the question
2. List 2-4 options
3. For each: pros, cons, what makes it the right call
4. Recommend one, name the deciding factor
5. List what you'd want to learn before committing

### 3. Capture output (optional)

Ask the dev: "Save this brainstorm to `.agentic/notes/<topic-slug>.md`?"

If yes, write the markdown. Otherwise, the brainstorm is ephemeral.

## What this does NOT do

- ❌ Create a Jira ticket
- ❌ Start a feature branch
- ❌ Touch workflow state
- ❌ Write code
- ❌ Run tests

## Hard rules

- ❌ Drift into implementation — if the dev says "OK let's build it", stop and say: *"Use /work PROJ-XXX once a ticket exists, or describe the ticket and I'll help draft it."*
- ❌ Update state — this is a standalone tool
