---
name: start
description: Begin a ticket. Fetches Jira ticket, validates Definition of Ready, fetches Figma frames, checks design completeness, detects foundation-prerequisite gaps, creates feature branch. Output — state file and phase advances to "planning" on success.
---

# /start — Ticket Initialization

Called by `/work` when state phase is `none`. **Do not call directly unless explicitly running standalone.** This skill:

1. Fetches the Jira ticket via `internal-jira` MCP
2. Classifies the ticket TYPE, then validates Definition of Ready against the per-type bar
3. Fetches linked Figma frames
4. Checks design completeness
5. **Detects foundation prerequisites** — primitives the ticket needs that don't exist yet
6. Creates the feature branch
7. Initializes the per-ticket folder + state file
8. Advances phase to `planning` on success

## Model preference

This skill orchestrates MCP calls + checks. **Default model is fine** (Sonnet typically). Don't escalate to Opus.

## Inputs

- **ticket key** (required) — e.g. `BEO-20`
- Current git branch

## Procedure

### 1. Pre-flight

```bash
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ ! "$current_branch" =~ ^(main|develop|master)$ ]]; then
  ask: "You're on branch '$current_branch', not main. Start from this branch anyway?"
fi
if [[ -n "$(git status --porcelain)" ]]; then
  refuse: "Working tree dirty. Stash or commit first."
fi
```

### 2. Fetch ticket

```
Call: internal-jira.jira_get_ticket(key: "<TICKET>")
```

Save raw JSON to `.agentic/plans/<TICKET>/raw.json` (create the directory first).

### 3. Classify the ticket type, then validate DoR

#### Ticket-type classification (do this FIRST — it sets the DoR bar)

The principle: **DoR = the inputs VERIFICATION will need to prove success for THIS kind of change.** Derive the required fields from that — don't hardcode six fields for everything. Real backlogs drift from e2e features to change requests, small adjustments, bugs, refactors, redesigns; forcing the full feature table on a bug bounces good tickets, and waving a redesign through with no Figma starves the parity check.

**Classify from signals, not the Jira `issueType` label.** Read what the ticket *changes* and what proving success will *require*. A "Story" whose body is "X is broken when Y, should do Z" is a bug; a "Task" that re-skins existing screens against new Figma is a redesign. `ticket.issueType` is a hint only — content wins. Record the classified `ticket_type` + the one-line signal that drove it in state (auditable, like the UI/non-UI call below). Canonical values: `feature | change-request | adjustment | bug | refactor | redesign` (change-request and adjustment share a DoR bar below).

| Type | Signal | DoR bar (what verification will need) |
|---|---|---|
| **feature** | net-new user-facing capability, an e2e slice | The full required-fields table below, as-is |
| **bug** | existing behavior is wrong; ticket describes broken vs intended | **Repro steps + expected-vs-actual REPLACE the user story.** Required: summary, repro steps, expected vs actual, environment/affected area. ACs optional — the "expected" IS the acceptance. Out of Scope / Figma only if the fix changes UI or scope is fuzzy; Permissions only when the defect touches access |
| **refactor** | internal restructure; user-visible behavior must NOT change | **Goal + behavior-that-must-NOT-change (the invariants) replace user story + ACs.** No Figma. Verification emphasis shifts to regression / no-behavior-change |
| **change-request / adjustment** | a delta on something already shipped | **Reference to the existing behavior (screen/route/endpoint/original ticket key) + the delta** — what changes AND what must stay. Lighter ACs covering just the delta. Figma only when visuals change; Permissions only if the delta touches access |
| **redesign** | same behavior, new look — visual overhaul of existing screens | **Figma mandatory + old→new screen mapping** (which existing screen each frame replaces). Behavior ACs may be light when behavior is unchanged — the design IS the spec; states per §6 |

Hybrids exist (a change-request that adds one new screen) — apply judgment: hold each part of the ticket to the bar that part needs, and record which parts drove the call. When genuinely ambiguous, ask the dev rather than mis-classifying.

BAs have a human-facing version of these per-type bars with good/bad examples: [`.agentic/guides/ba-ticket-authoring.md`](../../../.agentic/guides/ba-ticket-authoring.md) — point them at it when bouncing a ticket.

#### Required fields — the `feature` bar (other types swap/relax per the table above)

Check the parsed ticket. **Required fields** (workflow fails if missing):

| Field | Source | Failure message |
|---|---|---|
| Summary | `ticket.summary` | "Ticket has no summary" |
| User Story | `parsed.userStory` | "Missing User Story section" |
| Acceptance Criteria | `parsed.acceptanceCriteria` — present AND each is unambiguous + testable (see AC-quality heuristic below) | "ACs missing or not testable: <which>" |
| Out of Scope | `parsed.outOfScope` | "Missing Out of Scope — needed to prevent scope hallucination" |
| Figma URL | `parsed.figmaUrls[]` — required only WHEN the ticket has UI scope (see UI-scope signal below) | "UI-scope ticket has no Figma URL" |
| Permissions | `parsed.permissions` | "No Permissions section — who is allowed to do this?" |

**Figma URL is conditional on UI scope, not a blanket mandate.** The signal: do the ACs name a screen, state, or visual element a user sees (frontend/mobile UI scope)? WHEN yes → a missing Figma URL is a DoR failure. WHEN the ticket is backend/IaC/data-only → record `figma_status: "not-applicable"` in state, skip §5–§6, and proceed — `design-parity` later reports not-applicable, the same judgment the Figma-scope gate's "Skip Figma — for non-UI tickets" option encodes. A non-UI ticket must never fail DoR for lacking a design. Record the UI/non-UI determination (and which ACs drove it) so the call is auditable.

**AC-quality heuristic (not a binary Gherkin gate).** Gherkin form is nice but not required; what matters is that each AC has a clear **trigger + outcome** and is non-contradictory. WHEN an AC is prose but unambiguous and testable → restate it in `trigger → outcome` form and PROCEED (record the restatement). WHEN an AC is ambiguous, untestable, or **contradicts another AC** → that's a DoR failure: bounce/clarify (don't rubber-stamp it). Also run [`lint-ticket`](../lint-ticket/SKILL.md)'s contradiction + AC-quality checks here (opposite-outcome ACs, missing-precondition references, unquantified vague language, AC-count > ~25 split signal) and surface any hit at the §4 gate. Do NOT re-import lint-ticket's "is it Gherkin" check as a hard failure — AC form is governed by this trigger+outcome+non-contradiction bar, not by Gherkin presence.

### 4. Handle DoR failures

If anything missing:

```
⚠ Ticket BEO-20 is not Ready for Development.
Missing:
  ✗ Out of Scope section
  ✗ AC3 has no observable outcome — fails the trigger+outcome bar (§3)

Options:
  1. Bounce back to BA — I draft a Jira comment
  2. Fill in manually — paste the missing info here
  3. Force-proceed (NOT recommended) — plan quality will suffer

What's your call?
```

Wait for dev reply in chat. If "bounce back", compose comment text + pause workflow — cite the per-type bar that failed (§3) and link [`.agentic/guides/ba-ticket-authoring.md`](../../../.agentic/guides/ba-ticket-authoring.md) so the BA fixes the right fields.

If "fill in manually", write to `.agentic/plans/<TICKET>/overrides.md` and proceed treating overrides as part of the ticket.

If "force-proceed", add `forced_dor_bypass: true` to state and continue.

#### Completeness / boundary check (same gate)

Passing the required-fields table only means the ticket is *well-formed* — not that the scoped work yields a **complete, end-to-end usable feature**. Before leaving this gate, reason about whether the scope (ACs minus Out-of-Scope) actually delivers something a user can use start to finish, and SURFACE any gap here rather than silently building toward a dead-end. Flag, don't fix — these are clarifications for the dev/BA. Look for:

- **Dead-end flows** — a scoped path that leaves the user stuck. e.g. a sign-up with no confirmation/verification step leaves accounts UNCONFIRMED and unable to log in; a "create" with no way to view/edit the result; a multi-step flow missing the step that commits it. Ask whether the missing step is genuinely out of scope (then a follow-up ticket should exist) or an oversight.
- **Environment-coupled assumptions** — work that only functions against a non-production substitute and silently won't work for real. e.g. behavior that only works against a local emulator/mock and has no real-provider path; a feature gated on seed data, a dev-only flag, or a local-only endpoint. Never imply a local-emulator/mock path is the real/prod path.
- **External-service / auth testability** — when ACs depend on an external provider (auth, payments, email, etc.), DETECT how they can actually be verified and flag if they can't: (a) a local emulator/service is configured (e.g. a cognito-local service + a local endpoint env — ONE example for this repo, not the universal rule) → it can be exercised locally; (b) real provider creds + a usable test account are present in env → it can be verified against the real provider; (c) neither present → surface a **human_blocker** naming exactly which ACs will be UNVERIFIED. Don't treat (a) as equivalent to the production path.
- **Security posture / data-access / contract decisions are RESOLVED here, not parked.** A question like *"is this endpoint guarded or public?"*, *"who may read/write this data?"*, or any contract choice with security or data-access stakes must be DECIDED at this front gate (clarify it now) — it is NOT eligible to be carried forward as a "blocking open question" whose default `/implement-plan` later silently flips. The signal: *would proceeding one way vs the other change the feature's security posture or who can access data?* If yes, settle it before planning completes and record the decision in state, so it becomes a binding plan contract rather than a provisional default. (This closes the leak where a "guard the endpoints" intent silently shipped as PUBLIC and was downgraded to an advisory note.)
  - **When the ticket is SILENT on access, the default is least-privilege: GUARDED, not public.** Public is a deliberate exception that requires positive justification — explicit ticket text (a Permissions field saying "public / anonymous"), or an unmistakable nature (a marketing page, a health check, the auth-bootstrap endpoints themselves). The Permissions field is exactly what the BA guide forces upstream; its *absence* is not a license to ship public — it means default-guarded, and flag the missing Permissions answer as a gap to confirm. (Records like the conference-CRUD ticket, where two runs flip-flopped between guarded and documented-public, are the symptom this removes: silence resolves to guarded every time.)

If any such gap is found, present it at this gate alongside (or instead of) the DoR-failure prompt:

```
⚠ Scope completeness / boundary concerns for <TICKET>:
  ⚠ Dead-end — AC2 adds sign-up but no confirmation step; users stay UNCONFIRMED and can't log in. Is confirmation out of scope (follow-up ticket?) or missing?
  ⚠ Boundary — AC3 (federated sign-in) is only verifiable if a local emulator OR real provider test creds exist; neither detected → these ACs would ship UNVERIFIED.

Options:
  1. Clarify — I draft Jira/Figma comments for BA, workflow pauses
  2. Confirm boundary — you accept the gap (I record it; verify/open-mr will report the unverified ACs)
  3. Proceed — gap is genuinely covered elsewhere; tell me where

What's your call?
```

Record the outcome in state (e.g. a `human_blocker` entry or a `scope_boundaries` note) so `/verify` and `/open-mr` can report any ACs that ship unverified. Wait for the dev's reply before proceeding.

### 5. Fetch Figma frames

The ticket has one Figma URL pointing to a specific frame (the "anchor"). **Don't lock in on just that frame.** Designers put related states/variants as sibling frames on the same page; the implementation needs ALL relevant ones.

#### Rate-limit discipline (Figma View-seat caps are LOW — treat every call as scarce)

`/start` is the ONLY phase that calls the Figma MCP. Follow `.agentic/rules/_shared/figma-usage.md`:
- **Remote-first, navigable.** The agent must explore many frames across pages (anchor + siblings + cross-page) and sometimes search, so use the remote `figma` MCP (URL/node-id navigation + `search_design_system`) as PRIMARY — on a paid Dev seat its quota is workable. If the remote is unreachable/exhausted, or a specific frame needs a high-fidelity render, fall back to the local `figma-desktop` MCP, which reads only the CURRENT SELECTION — so PROMPT the dev: *"select `<frame>` in the Figma desktop app and reply when ready,"* then read it. Iterate per needed frame.
- **Fetch once, cache, read-from-cache everywhere.** Everything goes to `.agentic/plans/<TICKET>/figma/`; the planner reads ONLY that cache and never calls the MCP; `design-parity` prefers the cache and pulls live only when a needed frame is missing/stale (see `.agentic/rules/_shared/figma-usage.md`).
- **Two-pass, scope-gated.** Cheap metadata/thumbnail pass to pick frames → confirm at the scope gate → only THEN spend the expensive screenshot/variable calls, on confirmed frames only.
- **Batch + minimize.** Multiple node IDs per call where supported; pull global variables once (stable). Prefer committed design-system tokens over re-pulling once the design system exists.
- **Backoff on 429.** Exponential backoff (5s/15s/45s, ≤3 tries). If still capped: save partial cache, set `figma_status: "partial-ratelimited"`, and SURFACE it as a human-blocker. Never spin.

#### Procedure

1. Fetch the **anchor frame** metadata from `parsed.figmaUrls[0]` → `.agentic/plans/<TICKET>/figma/anchor.json`
2. Extract its parent page ID and the file's page list
3. CHEAP pass: list frames on the parent page (names + thumbnails only — no screenshots/variables yet)
4. Classify siblings: **High** (name contains the ticket key e.g. `[BEO-20]`, or strong AC keyword overlap), **Medium** (same logical area), **Drop** (unrelated). Add cross-page frames only if the ACs reference concepts absent from the anchor page.
5. **Figma-scope-confirmation gate** (per `/work`): dev confirms / drops / redirects. Save `.agentic/plans/<TICKET>/figma/scope.json`.
6. ONLY for the confirmed in-scope frames, fetch full data ONCE — screenshot (`<frame>.png`) + variables/tokens, batched where possible — to `.agentic/plans/<TICKET>/figma/<frame>.json`. Apply the backoff above.

#### If Figma MCP not configured / rate-limited

- **Not connected** (no OAuth) → skip with a warning; `figma_status: "skipped"`. On a UI ticket, `design-parity` reports **INCONCLUSIVE** (it no longer silently no-ops).
- **Rate-limited mid-fetch** → cache whatever was retrieved; `figma_status: "partial-ratelimited"`; surface as a human-blocker. The design-system / parity work resumes once the limit clears or the seat is upgraded.

### 6. Validate design completeness

For each frame:

| Check | What to look for |
|---|---|
| All states | default, hover, focus, disabled, loading, empty, error |
| Annotations | Figma annotation layer, not stickies |
| Tokens used | Variables for colors/spacing, not hex literals |
| Responsive variants | At least mobile + desktop where applicable |
| Brand surfaces | The branded design SURFACE the design depends on — not just tokens/fonts. Derive WHICH surfaces matter from the frames in scope; common ones are a brand background/pattern, a branded splash/launch screen, the logo/wordmark glyph, and required icon assets (e.g. for THIS ticket that might be a lavender 'Bg pattern' gradient + provider button icons — those are illustrative, not the rule). A brand surface the design clearly relies on but the codebase lacks is a **BLOCKING design-system foundation gap**, not a soft warning. |
| Theme adaptation | Every surface in the design must adapt to the active theme (light/dark/etc.). The general rule: any color/asset that is hardcoded and does NOT respond to the active theme is the bug. Check that backgrounds, text, borders, and brand surfaces all switch with the theme rather than baking one theme's values in (e.g. a hex literal like `#0a7ea4`/`#e8e6ff`/`#695efe` wired straight into a component such as a `BrandBackground` would fail this — those are examples of the failure, not the only ones). |
| Layout fidelity | The layout each frame implies must be honored — DERIVE it from the design, don't assume. If a frame depicts a standalone/full-screen layout (no surrounding app chrome), wrapping it in the app-shell header/nav is a divergence; conversely a frame shown inside the shell should keep it. (e.g. a full-screen auth/onboarding screen with no header is a common standalone case — an example, not a hardcoded "auth = header-less" rule.) |

**Per-state coverage = depicted vs inferred (record it, don't silently invent).** "Design completeness" must be *verified*, not asserted. For each in-scope screen, reason about which states an AC or edge-case actually asserts behavior in (NOT the full 7-state list — a state no AC references is not a gap). For each such state, record whether a cached frame **DEPICTS** it or it was **INFERRED** from exact ticket wording (e.g. CLA-2's error-message text came from the ticket's edge-cases, not a frame — that's a legitimate inferred state, but it must be marked so `design-parity` later reports it as *verified-against-ticket, not against-Figma*). The gate signal: *can design-parity later compare the built screen against a real frame OR an exact ticket spec for that state?* If neither exists for a state an AC needs, SURFACE it here rather than inventing the UI. Also record the **sibling-exploration outcome** from §5 (which sibling frames were found + their High/Medium/Drop calls, OR an explicit "metadata pass skipped because <reason>") — never assert completeness without the exploration that backs it.

If gaps found, ask dev:

```
⚠ Design has gaps:
  ✗ Missing states: "loading", "error"
  ✗ Missing responsive variant: mobile

Options:
  1. Auto-propose — I propose missing states based on existing design system
  2. Clarify — I draft Figma + Jira comments for designer/BA, workflow pauses
  3. Inline override — you describe what should happen, workflow proceeds

What's your call?
```

Log the chosen option in state. When the dev picks "Clarify", link [`.agentic/guides/designer-handoff.md`](../../../.agentic/guides/designer-handoff.md) in the Figma/Jira comment — it's the human-facing version of exactly these checks (states keyed to ACs, tokens over raw values, annotation layer, depicted-beats-inferred).

On a **`redesign`** ticket (§3), additionally verify the **old→new screen mapping**: every in-scope frame names the existing screen it replaces, and every screen the ticket says it redesigns has a frame. A frame with no mapped screen (or vice versa) is a gap to surface here, same options as above.

### 7. Foundation-prerequisite detection

Dispatch the `explorer` subagent (haiku) with the ticket + a focused brief to check foundation prerequisites. The explorer returns a list of primitives that the ticket needs but the codebase doesn't have yet.

Per-stack checklists live in [`.agentic/rules/_shared/foundation-prerequisites.md`](../../../.agentic/rules/_shared/foundation-prerequisites.md) — that file is the single source for which primitives each stack (mobile / frontend / backend / IaC) needs. Point the explorer's brief at THAT file rather than restating its lists here, so a stack change touches one place.

**Branded design system is a BLOCKING foundation gap.** Explicitly check for it, don't infer it from generic primitives. The branded design system is **tokens + fonts + primitives + brand SURFACES** — checking tokens/fonts/primitives alone is NOT sufficient. The check is: do the codebase's tokens/fonts/primitives/surfaces match THIS ticket's confirmed Figma values (§5/§6), or are they still a framework starter's defaults?

- **Mobile**: branded theme tokens matching Figma (palette/spacing/typography), branded fonts loaded, icon set wired — NOT a framework starter's default values still in place (e.g. an Expo stub theme whose accent is the default `#0a7ea4` in `src/constants/theme.ts` is the unbuilt case; the hex and path are illustrative).
- **Frontend**: design tokens matching Figma (semantic colors/spacing/typography/radius, e.g. via Tailwind `@theme inline`) + branded UI primitives (`<Button>`, `<Input>`, `<Card>`, `<Dialog>` etc., e.g. under `shared/ui/`) whose variants point at tokens, not raw hex.
- **Leftover starter scaffolding (any framework)**: detect and flag a framework's untouched defaults regardless of which framework (React/Vite, Next, Expo, RN, etc.) — e.g. the default framework logo (a `react.svg`/`expo` logo), demo/stub pages or routes (a starter `App`/Home-page stub, a `⚛ blog` demo header), and default theme values still wired in. These signal the design system / app shell was never branded. The specific assets named here are EXAMPLES of starter leftovers, not an exhaustive list.
- **Brand surfaces (both stacks)**: the branded VISUAL surface the design depends on must also exist, not just tokens. Derive which surfaces from the in-scope frames; commonly a brand background/pattern, a branded splash/launch screen, the logo/wordmark glyph, and required icon assets (e.g. for some tickets that's a lavender 'Bg pattern' gradient + provider button icons — illustrative). Any surface the design relies on but the codebase lacks is a BLOCKING design-system foundation gap — flag it, don't infer it's "covered" because tokens/fonts exist.

A MISSING branded design system — including any missing brand surface — is surfaced as a BLOCKING foundation gap at the foundation-decision gate (below) — never a soft warning.

**UI ticket whose design system is missing → build the design system FIRST.** When the ticket is a UI/frontend/mobile ticket and its target design system is absent, the right resolution is **bounce or split to build the branded design system before the feature work**, derived from THIS ticket's confirmed Figma designs (the anchor + sibling frames + tokens from §5/§6). The feature tasks must not run against design-system stubs.

If gaps found:

```
⚠ Foundation prerequisites missing for BEO-20:
  ✗ BLOCKING — branded design system absent: mobile/src/constants/theme.ts is generic Expo stub (no branded tokens/fonts/icons)
  ✗ Cognito Apple identity provider — iaac/.../cognito/ doesn't declare apple

This is a UI ticket and its design system is missing — the design system must be built FIRST,
derived from this ticket's confirmed Figma frames. These should land BEFORE the feature work. Options:
  1. Bounce ticket — create separate "design-system / foundation" ticket(s) first (recommended for a missing design system)
  2. Split — add design-system + foundation tasks at the START of the plan (marked type=foundation), feature tasks ordered after
  3. Force-proceed — AI builds against stubs; expect mismatch with Figma and broken auth flow

What's your call?
```

Wait for dev answer in chat.

### 8. Create the feature branch

```bash
slug=$(echo "$ticket_summary" | tr '[:upper:]' '[:lower:]' | tr -c '[:alnum:]' '-' | tr -s '-' | sed 's/^-\|-$//g' | cut -c1-30)

# branch prefix follows the CLASSIFIED ticket_type (state), not the raw Jira label
case "$ticket_type" in
  bug) type=fix ;;
  refactor) type=refactor ;;
  *) type=feat ;;
esac

# Capture the BASE branch the feature is cut from (the current branch, default main).
# /open-mr reads this to target the MR/PR at the right base.
base_branch="${current_branch:-main}"

branch="${type}/${TICKET}-${slug}"
git checkout -b "$branch"
```

Record `base_branch` (= the branch the feature was cut from, default `main`) in the state file (below) — `/open-mr` reads it to target the MR/PR.

If §3's classification disagrees with Jira's `issueType` (e.g. a "Story" classified as a `bug`), the **classified type wins** for the branch prefix — `bug` → `fix/`, everything else → `feat/`.

### 9. Initialize state file + plan directory

Write `.claude/state/<TICKET>.json`:

```json
{
  "ticket": "BEO-20",
  "ticket_type": "feature",
  "ticket_type_signal": "net-new e2e capability (ACs add screens + endpoints that don't exist)",
  "phase": "starting",
  "branch": "feat/BEO-20-...",
  "base_branch": "main",
  "plan_dir": ".agentic/plans/BEO-20",
  "plan": ".agentic/plans/BEO-20/plan.md",
  "current_task": null,
  "verify_retries": {
    "test_failure": 0, "type_error": 0, "security_finding": 0,
    "ac_unmet": 0, "convention_violation": 0, "design_parity": 0,
    "build_failure": 0, "runtime_failure": 0, "process_gap": 0
  },
  "iterations": { "verify_loops": 0, "fix_dispatches": 0 },
  "max_verify_loops": 3,
  "design_decision": "auto-propose",
  "foundation_decision": "split",
  "forced_dor_bypass": false,
  "history": [
    {
      "phase": "starting",
      "ts": "<ISO-8601>",
      "summary": "Ticket fetched, DoR ✓, design check: 2 states missing — auto-propose, foundation: 2 gaps — split into plan"
    }
  ],
  "created_at": "<ISO-8601>",
  "updated_at": "<ISO-8601>"
}
```

### 10. Return to driver

Tell the driver: "starting → planning". Driver advances to `/plan`.

If anything failed and the dev chose "bounce back" / "clarify", return: "still in starting, paused for clarification" — driver pauses workflow.

**Evidence discipline:** every result `/start` returns (DoR pass/fail, design-completeness + foundation findings, the created branch) is grounded in the actual Jira/Figma MCP + `git` output it read THIS run — never estimated or recalled — and the return echoes the driver's per-pass `CANARY-<random-word>-<4 digits>` token verbatim so the driver can confirm the result came from THIS dispatch.

## Standalone mode

If invoked directly (not via /work):

- Same procedure
- No state file written unless dev confirms: "Start the workflow on BEO-20? (state will be initialized)"

## Hard rules

- ❌ Skipping DoR validation just because the dev seems impatient
- ❌ Holding every ticket to the full `feature` DoR table — classify first (§3), then apply that type's bar. Equally: never relax below what verification needs (a redesign without Figma, a refactor without invariants, a bug without repro steps all fail their own bar)
- ❌ Inventing missing design states without showing dev the proposals
- ❌ Inventing missing foundation primitives — surface to dev
- ❌ Creating a branch before DoR passes
- ❌ Editing the Jira ticket via writeback without dev approval
