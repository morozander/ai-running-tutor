# Writing tickets the AI flow can run on — BA guide

**Audience:** BAs / POs writing Jira tickets for teams on the spec-driven AI workflow (`/work`).
**Why this exists:** roughly half of the flow's success is decided before a dev types anything. Every section you write (or skip) is consumed by an automated gate: your ACs become the test plan, your Out-of-Scope is the only thing preventing scope invention, and an unanswered permissions question stalls the ticket mid-sprint with a question back to you. Rich, structured tickets are how we get to near-zero high/critical bugs.

## How the flow reads your ticket

1. **`/start`** validates Definition of Ready and bounces tickets with gaps — back to you.
2. The **planner** turns each AC into bounded tasks and builds an AC-coverage matrix — an AC nobody can test becomes a task nobody can finish.
3. **Verification** proves each AC with real tests, a booted app, and (for UI) a rendered-screenshot-vs-Figma comparison.

Write each section for its consumer: *would a machine (or a new hire) know exactly when this is done and how to prove it?*

## One structure, six ticket types

The flow classifies your ticket by **what it changes** — and requires *the inputs verification will need to prove success for that kind of change*, not the same six fields every time. Pick the bar that matches:

| Type | Required | Optional / when relevant |
|---|---|---|
| **Feature** (net-new capability) | Summary · User Story · Acceptance Criteria · Out of Scope · Permissions · Figma URL (when there's UI) | Background, linked tickets |
| **Bug** | Summary · **Repro steps** · **Expected vs actual** · environment / affected area — repro + expected-vs-actual REPLACE the user story | ACs (the "expected" already is one) · Figma only if the fix changes UI · severity |
| **Change request / Adjustment** | Reference to the existing behavior (screen, endpoint, or original ticket key) · **the delta** — what changes AND what must stay | Lighter ACs covering just the delta · Figma when visuals change · Permissions if access changes |
| **Refactor** | Goal (why restructure) · **behavior that must NOT change** (the invariants) | No Figma; no user story — the invariant list replaces ACs |
| **Redesign** | **Figma mandatory** · old→new screen mapping (which existing screen each frame replaces) | Behavior ACs only where behavior actually changes — the design is the spec |

Hybrid tickets happen (a change request that adds one new screen): meet the strictest bar any part needs, and say which part is which. The flow classifies from *content*, not the Jira issue-type label — a "Story" whose body says "X is broken when Y" gets held to the bug bar.

## Good vs bad, field by field

### Acceptance criteria — trigger + outcome + testable

| | Example |
|---|---|
| ✗ Bad | "Sequences should stop properly." — no trigger, no observable outcome, untestable |
| ✗ Bad | "The page should be fast." — unquantified vague language gets flagged; write *"search results render within 2s for up to 1,000 rows"* |
| ✓ Good (Gherkin, recommended) | *Given a lead has an active sequence / When the user clicks "Stop Sequence" / Then the status changes to "Stopped" and no further emails are queued* |
| ✓ Good (prose is fine if unambiguous) | "Clicking 'Stop Sequence' on a lead with an active sequence sets status to Stopped and cancels all queued emails." |

Also avoid: two ACs with the same trigger but opposite outcomes (the linter flags the contradiction and the ticket bounces); an AC referencing an element nothing introduced earlier; more than ~25 ACs (split the ticket).

### Out of Scope

- ✗ Bad: missing, or "everything else" — the AI then invents the boundary itself.
- ✓ Good: "Out of scope: bulk-stopping sequences, the email-template editor, mobile layout (follow-up BEO-31)." When a step is deliberately excluded, **name the follow-up ticket** — that's the difference between a planned boundary and an apparent oversight.

### Permissions

- ✗ Bad: missing — the flow stalls asking *"who is allowed to do this?"*
- ✓ Good: "Only org admins and the lead's owner may stop a sequence. Endpoint is authenticated; viewers see the button hidden, not disabled."

### Bug — expected vs actual

- ✗ Bad: "Login is broken on mobile."
- ✓ Good: "Repro: iOS app, signed out → tap 'Sign in with Google' → complete OAuth. Expected: lands on Home, session persists across restart. Actual: returns to sign-in; token never stored. Started after release 2.41."

### Refactor — invariants

- ✓ Good: "Goal: extract sequence scheduling into its own service. Must NOT change: email send times, the GraphQL schema, any visible UI. Existing tests must pass unmodified."

## Answer the security questions in the ticket — the front gate will force them anyway

`/start` refuses to carry forward any open question that changes the **security posture** or **who can access data** — the workflow pauses until a human decides. Cheaper to answer in the ticket:

- Is each new/changed endpoint **guarded or public**?
- **Who may read / who may write** the data this touches (role, ownership)?
- Any contract choice where one option exposes more than the other? Decide it, don't leave it open.

## The dead-end checklist — self-run before sprint

Passing the field list means the ticket is *well-formed*; `/start` also checks the scope is *usable end-to-end*. Run this yourself:

1. **Can a user finish the journey with ONLY what's in scope?** A sign-up with no confirmation step leaves accounts that can never log in.
2. **Can the result be seen and used?** A "create" with no way to view or edit what was created is a dead-end.
3. **Multi-step flows: is the committing step in scope?**
4. **Does it work for real, or only in dev?** A flow that only works against seed data, a feature flag, or a local mock isn't done. If verification needs an external provider (auth, payments, email), say how it can be tested — test account? sandbox?
5. **If a needed step is genuinely out of scope**, link the follow-up ticket by key, in the ticket.

## Self-check with /lint-ticket

Before sprint planning, run `/lint-ticket <KEY>` (or ask any dev on the flow to). It applies the same per-type bar as `/start`, scores the ticket, flags contradictions and vague language, and proposes AC rewrites — the report can be pasted straight back into Jira. A ticket that lints clean almost never bounces at `/start`.

---

*Designers have a companion guide for the Figma side of the handoff: [designer-handoff.md](./designer-handoff.md).*
