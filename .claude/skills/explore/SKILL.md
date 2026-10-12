---
name: explore
description: Standalone — read-only codebase exploration. "Where does X live?" "How is Y wired?" "Which files reference Z?" Dispatches the Explore subagent. Never edits files. Doesn't touch workflow state.
---

# /explore — Codebase Exploration

Standalone read-only investigation. Useful when the dev needs to understand structure before deciding what to do (or before opening a ticket).

> **Evidence discipline.** Every file path + line number you report must be copied from real Read/Grep/Glob output (the Explore subagent's actual findings) — never guessed; a path you can't confirm exists doesn't go in the report.

## Inputs

- A question, symbol, file pattern, or "find me..." from the dev

## Procedure

### 1. Determine search breadth

Pick based on the question:

| Question shape | Breadth |
|---|---|
| "Where is `foo` defined?" | quick — single targeted lookup |
| "How is auth wired across backend?" | medium — moderate exploration |
| "Which packages touch the GraphQL schema?" | very thorough — search across multiple locations |

Choose explicitly. Don't default to thorough on simple questions — wastes time and budget.

### 2. Dispatch the Explore subagent

```
Task(
  subagent_type: "Explore",
  prompt: "<the dev's question, rephrased clearly>",
  description: "Explore: <topic>"
)
```

Pass the breadth explicitly in the prompt: "Search breadth: medium."

### 3. Return findings

The Explore agent returns a structured map of files + relevance notes. Present them with markdown links so the dev can click through:

```
Found 3 places where token refresh happens:

- [frontend/src/graphql/links/auth-link.ts:42](frontend/src/graphql/links/auth-link.ts#L42) — proactive refresh in SetContextLink
- [frontend/src/graphql/links/error-link.ts:18](frontend/src/graphql/links/error-link.ts#L18) — reactive refresh on UNAUTHENTICATED
- [mobile/expo-boilerplate/src/api/client.ts:52](mobile/expo-boilerplate/src/api/client.ts#L52) — same pattern, separate impl

The two FE/mobile impls are very similar — candidate for a shared `_shared/apollo-link-chain.md` rule (or a small shared package).
```

### 4. Offer next steps

After the explore, ask:

- "Want me to brainstorm refactoring options?" → `/brainstorm`
- "Want me to start a ticket for X?" → ask for ticket key, then `/work`
- "Want me to lint a candidate ticket against DoR?" → `/lint-ticket`

Don't auto-progress — the dev picks.

## When NOT to use /explore

- You already know the file path → just use Read directly
- Question is "fix this code" → that's `/debug` or `/work` (if it's ticket work)
- Need to make changes → wrong skill (this is read-only)

## What this does NOT do

- ❌ Edit any file
- ❌ Run any non-read command
- ❌ Touch workflow state
- ❌ Open MRs or post to Jira

## Hard rules

- ❌ Calling Write / Edit from inside /explore
- ❌ Defaulting to "very thorough" — cost discipline
- ❌ Returning huge file dumps — return *findings* (file + relevance line), not raw content
