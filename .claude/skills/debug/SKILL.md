---
name: debug
description: Standalone — systematic root-cause investigation of a bug or error. Doesn't touch workflow state. Delegates to superpowers:systematic-debugging for the 4-phase process — observe, hypothesize, test, fix.
---

# /debug — Off-Flow Debugging

Use when the dev hits an error or unexpected behavior that's NOT part of the active ticket — *"This stack trace doesn't make sense"*, *"Why is the test flaking?"*, *"How does X get called?"*

> **Evidence discipline.** Every claim in a debug session — the repro, the failing output, the confirmed root cause, "the fix changed behavior" — must be backed by real command output you actually ran and can quote, never estimated or assumed.

## Inputs

- An error, symptom, stack trace, or "behaves wrong when..." description from the dev

## Procedure

### 1. Acknowledge state context

If active workflow state exists on the current branch, inform the dev:

> "You're on `feat/PROJ-123-...` (phase: `implementing`). This debug session is standalone — it won't update workflow state. If the bug is *caused by* the active ticket's code, fix it as part of the ticket via /work after debugging."

### 2. Delegate to superpowers:systematic-debugging

Invoke the Superpowers `systematic-debugging` skill. The 4 phases:

1. **Observe** — get the precise reproduction. What command, what input, what output, what stack? Don't guess.
2. **Hypothesize** — generate 2-3 hypotheses ranked by likelihood. Avoid the first-thought trap.
3. **Test** — for each hypothesis, find the cheapest test that proves or disproves it. Run them in order of cheapness.
4. **Fix** — once root cause is confirmed, propose the smallest correct fix.

If Superpowers isn't installed, run the same 4 phases inline.

### 3. Decide what to do with the fix

Once root cause is found, ask:

- **Option A** — fix it now, off-flow (small change, not ticket-related)
- **Option B** — log it for a future ticket (don't fix now)
- **Option C** — fold into the active ticket (if the bug is in code the active ticket touches)

If A or C: make the fix. If C, you may need to run `/work` afterward so the fix flows through verification.

If B: write a brief note to `.agentic/notes/bugs.md` (or wherever the team logs these) so it's not lost.

### 4. Don't fix-and-run

Before declaring the bug fixed, **reproduce the failing case ONE more time** to confirm the fix actually changed behavior. Then test that no regression was introduced elsewhere.

## What this does NOT do

- ❌ Start a new ticket
- ❌ Update workflow state
- ❌ Auto-commit fixes — propose, let dev decide
- ❌ Skip the observe/hypothesize phases ("I think it's X" — no, prove it)

## Common debug patterns to apply

- **Read the actual error message twice** — it usually says exactly what's wrong; we just skip past it
- **Check git diff first** — recent changes are the most likely culprit
- **Bisect** — `git bisect` for "worked yesterday, fails today"
- **Print the value** — log what you *think* is true; you're often wrong
- **Read the framework source** — for "this lib is doing something weird"

## Hard rules

- ❌ Fixing without confirming root cause (treats symptoms, not disease)
- ❌ Skipping the reproduction step ("I'll just try a fix and see")
- ❌ Force-committing or amending without surfacing the fix to the dev
- ❌ Touching files unrelated to the bug
