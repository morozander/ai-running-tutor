---
name: lint-ticket
description: Standalone Definition-of-Ready check on a Jira ticket. Reports gaps and contradictions. Doesn't touch state. Use to validate a ticket before pulling into a sprint.
---

# /lint-ticket — Definition of Ready check

Standalone Jira ticket validation. Doesn't create a branch, doesn't write state, doesn't fetch Figma. Just reads the ticket and reports DoR conformance.

> **Evidence discipline.** Every count, quote, and AC reference in the report must be copied verbatim from the fetched Jira ticket (`jira_get_ticket` output) — never inferred or recalled; if the fetch didn't return it, don't claim it.

## Model preference

Sonnet (default). Pattern matching with mild reasoning about contradictions.

## Inputs

- **ticket key** (required) — e.g. `BEO-21`

## Procedure

### 1. Fetch ticket

```
Call: internal-jira.jira_get_ticket(key: "<TICKET>")
```

### 2. Classify the ticket type, then run DoR checks

**Classify first — the bar is per-type.** Classify the ticket from content signals as feature / bug / refactor / change-request / adjustment / redesign, exactly per [`/start` §3's classification table](../start/SKILL.md) — the signals and per-type DoR bars live THERE; don't duplicate them here. State the classified type + the one-line signal in the report. The table below is the **`feature`** bar; for other types, swap requirements per that table — e.g. a bug's repro steps + expected-vs-actual replace the User Story (don't flag "Missing User Story" on a bug with a solid repro), a refactor needs invariants and no Figma, a redesign fails without Figma + an old→new screen mapping.

| Check | Pass criteria |
|---|---|
| Summary present | non-empty |
| User Story | section detected |
| Acceptance Criteria | each AC has a clear trigger + outcome, is testable, and contradicts no other AC — the same bar as [`/start` §3's AC-quality heuristic](../start/SKILL.md). Gherkin is a recommended form, not the bar: a prose AC that is unambiguous gets a proposed rewrite (§4), not a failure |
| Out of Scope | section detected |
| Figma URL | at least one figma.com URL — required only WHEN the ticket has UI scope (an AC names a screen, state, or visual element a user sees); for a backend/IaC/data-only ticket record `figma: not-applicable`, not a blocker. State the UI/non-UI call in the report so it's auditable |
| Permissions | "Permissions" or "Access" section detected |
| Background | recommended but not blocking |
| Linked tickets | informational |

### 3. Run contradiction checks

Scan ACs for:

- Two ACs with same trigger but opposite outcomes (e.g., CANCEL button described twice differently)
- AC mentions an element not introduced earlier (missing precondition)
- Vague performance language ("should be fast", "real-time") without quantification
- AC count > 25 — likely ticket too big, suggest split

### 4. Run AC quality checks

For each AC:

- Is it Gherkin (Given/When/Then)?
- If prose, propose Gherkin rewrite (show the proposed shape)
- Does it have observable outcome (Then clause)?
- Does it specify tie-breakers (when relevant)?

### 5. Output

Structured report to dev:

```
📋 Ticket Lint Report — BEO-21

🏷 Type: feature (signal: net-new e2e capability) — applying the feature bar; other types per /start §3

✅ DoR
   ✓ Summary present
   ✓ User Story present
   ✓ Permissions section
   ✗ Out of Scope MISSING
   ✗ Figma URL missing (UI scope: yes — AC2/AC6 describe screens, so this blocks; not a blocker on a non-UI ticket)
   ⚠ Background recommended

📝 Acceptance Criteria (8 found, 6 Gherkin)
   ✓ AC1: Gherkin, complete
   ⚠ AC3: prose — proposed rewrite:
      Given the sequence is already stopped (any reason)
      When user views the lead's profile
      Then the "Stop Sequence" button is hidden
   ✗ AC4: contradicts AC5 — both describe CANCEL button with opposite outcomes
   ⚠ AC5: vague — "should be fast" — quantify (e.g., "complete within 2s")

⚙ Suggested fixes
   1. Add Out of Scope section listing what this ticket explicitly excludes
   2. Attach a Figma frame URL
   3. Rewrite AC3 in Gherkin (proposed above)
   4. Resolve AC4 vs AC5 contradiction — one should be APPLY button
   5. Quantify AC5

🎯 Score: 6/10 (3 blockers, 2 warnings)
🚦 Verdict: ❌ NOT READY for development

📤 Add this report as a Jira comment to help the BA fix it? (yes/no/edit)
```

### 6. Optional — write back to Jira

If `internal-jira-mcp` v0.2+ has `jira_add_comment`, offer to post the report.

For now (v0.1 only has `jira_get_ticket`), just show "Copy and paste into Jira if desired."

## When to use

- BA hands you a ticket → run before pulling into sprint
- Sprint planning → batch-lint the candidates
- Comparing BA output quality over time → save reports to a folder
- BAs self-checking before handoff → the human-facing version of this bar (per-type templates + good/bad examples) is [`.agentic/guides/ba-ticket-authoring.md`](../../../.agentic/guides/ba-ticket-authoring.md); link it in any report posted back to Jira

## Doesn't do

- ❌ Create branches
- ❌ Initialize workflow state
- ❌ Fetch Figma (use `/start` for that)
- ❌ Modify the ticket (unless dev explicitly confirms post-back)

## Hard rules

- ❌ Don't proceed to `/start` from inside this skill — separate skills, dev decides
- ❌ Don't suppress the ticket-not-found error
