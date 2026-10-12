---
name: verify
description: Multi-agent verification. Wave 1 runs qa, code-review, security, build-check, and runtime-smoke (boots the affected apps, drives + RECORDS the primary journey) in parallel; wave 2 runs design-parity (captures the route × theme screenshot matrix against the still-running ledgered apps, compares to Figma). Coordinator (opus) aggregates and decides PASS / LOOP / ESCALATE. A skipped safety verifier or a human-blocker escalates — it never silently passes.
---

# /verify — Multi-Agent Verification

Called by `/work` when state phase is `verifying`. Runs verifier agents, then a coordinator aggregates and decides.

The central lesson from earlier runs: **code compiling + unit tests passing is NOT evidence the app runs or looks right.** This skill therefore boots the affected apps under the pinned toolchain, drives + RECORDS the primary journey (runtime-smoke), captures the rendered route × theme matrix (design-parity, wave 2), and refuses to PASS when a runtime/visual check was skipped rather than satisfied.

## Model strategy

| Agent | Model | Why |
|---|---|---|
| `qa-verifier` | sonnet | Derives + runs tests |
| `code-review-verifier` | sonnet | Convention checks |
| `security-verifier` | sonnet | First-pass scan |
| `build-check-verifier` | haiku | Runs build/compile commands, reads exit codes |
| `runtime-smoke-verifier` | sonnet | Boots affected apps, drives + RECORDS the primary journey, classifies blockers |
| `design-parity-verifier` | sonnet | Captures the route × theme matrix (wave 2, against the ledgered apps) + compares to Figma |
| `security-deep-review` (if needed) | opus | Triage critical security findings |
| `coordinator` | opus | Aggregates all reports, decides routing — high-impact judgment |

Opus is invoked at most twice — `coordinator` always, `security-deep-review` only on critical findings.

## Scope-awareness (the driver is the single owner of shared verify context)

The `/work` driver is the one component that sees the whole pass, so it captures shared context ONCE and hands it to every verifier — they do NOT each re-derive it (independent re-derivations duplicate the same `git diff` work per verifier and burn context for no new information).

Before dispatching, the driver captures the shared artifacts (re-capture at the START of EVERY wave-1 dispatch — first verify AND each re-verify, because fix commits land after pre-flight):

```bash
mkdir -p .agentic/plans/<TICKET>/verify
git diff main...HEAD            > .agentic/plans/<TICKET>/verify/diff.patch
git diff --name-only main...HEAD > .agentic/plans/<TICKET>/verify/changed-files.txt
```

Then compute the **affected packages = packages with changed files PLUS their downstream consumers**. A change in one package can break another with no file change of its own, so cross-check the changed files against the plan's `Affected Packages` and include any consumer of a cross-package contract the change touched. The signal: *did the change alter a GraphQL schema / codegen source / shared API / shared type the other package depends on?* If yes, that consumer is affected (e.g. a backend schema change → the frontend whose generated client can now break, even with no FE file changed). `build-check` and `runtime-smoke` verify exactly this affected set — not just the literally-changed packages.

**Ticket type shifts verification EMPHASIS (same waves, different headline evidence).** The classified `ticket_type` (state, set by `/start` §3) is part of the shared context — pass it into the qa / runtime-smoke / design-parity prompts alongside the ACs. **bug** → the headline evidence is the failing repro test now passing PLUS no regression in the touched area (a green suite that never contained the repro test proves nothing). **refactor** → *behavior unchanged IS the acceptance*: the pre-existing suite passing unmodified is the strongest signal, design-parity is typically `not-applicable`, and a test edited to accommodate changed behavior is a finding, not a fix. **redesign** → design-parity is the headline gate (against the ticket's old→new screen mapping). **change-request / adjustment** → verify the delta + the immediate neighbors it can break, not the whole surrounding feature. **feature** → the full bar as written. This shifts emphasis only — it never licenses skipping a safety verifier (runtime-smoke always runs on affected packages; design-parity is `not-applicable` only for genuinely non-UI work).

Pass into each verifier prompt: the affected-packages list + the `verify/diff.patch` and `verify/changed-files.txt` paths (so diff-reading verifiers read the artifact instead of re-running `git diff`). **Frozen install is cheap, not free-to-skip:** a `pnpm install --frozen-lockfile` re-links from pnpm's content-addressed store in seconds when node_modules is already populated and the lockfile is unchanged — verifiers should run it (it's the lockfile-drift gate) but not budget it as a cold download; never SKIP it.

## Canary + evidence protocol (per pass)

The `/work` driver generates ONE canary token per pass — `CANARY-<random-word>-<4 digits>` — and
passes it to this skill. Inject it **verbatim** into EVERY verifier dispatch — the wave-1 set (qa,
code-review, security, build-check, runtime-smoke), the wave-2 design-parity, security-deep when it
runs, AND the coordinator. Every dispatched agent MUST echo the canary verbatim in its return — a
missing/altered canary means the return is suspect → **re-dispatch** (do not trust it).

For **runtime-smoke** AND **design-parity** additionally inject a **render-canary** —
`RENDER-<random-word>-<4 digits>` (the SAME token to both) — a token the running app must actually
DISPLAY (or that runtime-smoke plants in a fixture/seed). runtime-smoke confirms it during the
recorded journey (in the DOM, ideally visible in a recorded frame); design-parity confirms it in
each still it captures. A recording/capture missing it is `inconclusive`, never a pass (it may be
fabricated/stale).

Every verifier returns a machine-checkable `evidence` block — the commit SHA it verified against,
exact counts COPIED from its own command output (tests, build exit code, routes/console-errors,
etc.), artifact paths, and `lsp: { calls, usedFor }`. Numbers must be COPIED from real output, never
estimated. The mechanical re-check of this evidence is **scripted, not prose** — the deterministic
integrity gate (`.claude/scripts/verify-integrity.mjs`, §4) validates every report (parse + status +
canary echo + evidence block), `git cat-file -e`s every claimed SHA, and stats every claimed artifact
path BEFORE the coordinator is dispatched; that script is the teeth. The **coordinator** then does
the judgment-layer checks a script can't (count cross-checks against file contents, internal
contradictions, `lsp` semantics — see coordinator.md §1b) and flags any claim that fails — or a
missing/altered canary — as a `hallucination_flag`; the work is re-done or ESCALATED, never trusted.

## Procedure

### 1. Pre-flight

```bash
git status --porcelain  # must be empty
```

Dirty tree → refuse, ask dev to commit/stash. Confirm the pinned toolchain is active:

```bash
mise exec -- node --version   # must match the node pin in mise.toml
mise exec -- pnpm --version   # must match the pnpm pin in mise.toml
# A resolution failure or a version that doesn't match mise.toml means the run is
# not representative — fix the toolchain before verifying.
```

Then determine **whether this is the FIRST verify or a fix-loop re-verify**, and check the iteration ceiling:

```
# Iteration ceiling (honest budget guard — see §"Iteration-ceiling guard")
state.iterations          ||= { verify_loops: 0, fix_dispatches: 0 }
state.max_verify_loops    ||= 3
is_reverify = state.verify_findings exists AND state.fix_routing (or state.verify_findings) is non-empty
              # i.e. a prior verify produced a LOOP and /implement has since run in fix-mode

if is_reverify AND state.iterations.verify_loops >= state.max_verify_loops:
  # Surface the iteration-ceiling gate (per coordinator) and PAUSE — do NOT dispatch another wave.
  state.phase stays "verifying" (paused)
  surface to the dev:
    "⏸ Iteration ceiling reached.
     verify_loops = <state.iterations.verify_loops> / max_verify_loops = <state.max_verify_loops>
     (fix_dispatches so far: <state.iterations.fix_dispatches>)
     The workflow has re-verified this ticket the maximum number of times without a clean PASS.
     Rough estimate only (NOT an enforced budget): ~$<approx> spent so far.
     Left running for your inspection:
       • <what> (<port/name>) — teardown: <one-liner>
     Options:
       • reply 'raise ceiling N' to set max_verify_loops and continue
       • inspect .agentic/plans/<TICKET>/verify/coordinator.json and fix manually, then 're-verify'
       • mark as accepted-risk and continue to /handoff (records the gap in the MR)"
  # This pause returns BEFORE §6a ever runs, so surface the ledger HERE: read
  # .agentic/plans/<TICKET>/verify/runtime-ledger.json and list every live entry with its
  # teardown one-liner (ledger empty/absent → say "nothing left running"). Per
  # .agentic/rules/_shared/leave-no-trace.md, left-up for inspection is fine ONLY when reported.
  return — driver pauses for dev input

state.iterations.verify_loops += 1   # count this verify pass — persist via
                                     # `node .claude/scripts/state-update.mjs <state-file> incr iterations.verify_loops`
                                     # (locked + atomic; never read-modify-write the file whole)
```

### 1a. Execution mode — RAM-aware parallel vs sequential

Read `state.exec_mode` (the driver probed host RAM ONCE at pass start — see `work/SKILL.md` §2b). The wave composition, verifier roster, and gates below are **IDENTICAL** in both modes; this is a MODE branch, not a rewrite — only parallel-vs-sequential dispatch + the resource caps differ:

- **AMPLE** → run wave 1 exactly as written below: all in-scope verifiers dispatched in parallel in a single message.
- **CONSTRAINED** (host total ≤ ~18 GB — a parallel verifier wave OOM-crashes it) → run the SAME wave-1 verifiers **SEQUENTIALLY**, one at a time, with:
  - every node command capped `NODE_OPTIONS=--max-old-space-size=1536`
  - `jest --maxWorkers=2`
  - ONE spawn at a time (no concurrent Task fan-out); prefer delegate-then-ground-truth over parallel fan-out
  - a **cooldown gate** between heavy steps — wait until free mem ≥ ~45% before dispatching the next verifier / boot / bundle
  - boot/bundle steps (runtime-smoke) one at a time

  Same verifiers, same JSON outputs, same coordinator — just serialized + capped.

### 2. Wave 1 — dispatch the verifiers (parallel in AMPLE, sequential in CONSTRAINED — see §1a)

**Scope of this wave depends on whether it's the first verify or a fix-loop re-verify.**

- **First verify of a ticket** → run the FULL wave-1 (all 5 verifiers below) + wave-2 (design-parity), exactly as written.
- **Fix-loop re-verify** (state has `verify_findings`/`fix_routing` from a prior LOOP) → re-run ONLY the verifier(s) whose findings were fixed in this loop, **PLUS `build-check` and `runtime-smoke` ALWAYS** (regression guard — a fix can break the build or the boot even if those weren't the original findings). Do NOT re-run the untouched verifiers; carry their prior PASS report forward. Compute the set:

  ```
  fixed_verifiers = { the agent that owned each finding in state.fix_routing }
                    # e.g. fix touched a code-review finding → re-run code-review-verifier
  reverify_set    = fixed_verifiers ∪ { build-check-verifier, runtime-smoke-verifier }
  # design-parity re-runs in wave 2 ONLY if it is in fixed_verifiers (a brand/parity gap was fixed),
  # because it captures against the services runtime-smoke re-boots (and re-captures the fixed routes).
  ```

  Verifiers NOT in `reverify_set` are skipped for this pass; the coordinator reads their last-good JSON from the prior pass (these stay on disk in `verify/`). `runtime-smoke` still always re-runs as the regression guard, but it SCOPES what it re-boots/re-sweeps/re-records to the layer the fix could plausibly affect (carrying untouched routes' prior sweep results forward under `carried_forward`; when design-parity re-runs, IT carries its own prior screenshots forward the same way); when it can't confidently localize the fix — or the fix touched shared chrome / a theme token / routing / a cross-package contract — it re-boots the full affected set. (A backend-only fix that touches no FE contract won't re-boot the frontend; a backend fix that changed the schema WILL, because the frontend is a consumer.)

Send the in-scope verifiers per `state.exec_mode` (§1a): in **AMPLE**, a single message with parallel Task calls; in **CONSTRAINED**, one Task at a time with the cooldown gate between them (same verifiers, same outputs — just serialized + capped). **Pass real context inline** — never a bare "verify branch for <TICKET>". On a re-verify, also pass the specific fixed findings so each re-run verifier confirms the fix. Right-size each prompt — don't inline context a verifier won't reason over:
- **All** verifiers get: ticket id, affected-packages list, plan path, and the `verify/diff.patch` + `verify/changed-files.txt` paths.
- **AC-grading verifiers** (qa, runtime-smoke, design-parity) additionally get the inline AC list + the `ticket_type` (it shifts their emphasis — see §Scope-awareness) + (runtime-smoke/design-parity) the target screens/routes + Figma scope path. The signal: does this verifier grade work per-AC or render the design? If yes, it needs the ACs/screens; if not (build-check, security), it reads the plan path on demand and skips the inline AC list.

```
Task(subagent_type: "qa-verifier", prompt:
  "Verify ticket <TICKET>. Affected packages: <list>. Plan: .agentic/plans/<TICKET>/plan.md.
   ACs: <inline AC list>. Run the test suites for the affected packages UNDER THE PINNED
   TOOLCHAIN (mise exec -- pnpm test). Write verify/qa.json. Follow .claude/agents/qa-verifier.md.
   CANARY: <CANARY> — echo verbatim in your return. Return an `evidence` block (commit SHA, counts
   copied from real output, artifact paths, lsp); the scripted integrity gate (§4) re-checks it + the canary echo; the coordinator judges the rest.")

Task(subagent_type: "code-review-verifier", prompt:
  "Verify ticket <TICKET>. Affected packages: <list>. Plan: ...plan.md. Audit the branch diff
   against .agentic/rules/<pkg>/*.md and run each linter. Write verify/code-review.json. ...
   CANARY: <CANARY> — echo verbatim in your return. Return an `evidence` block (commit SHA, counts
   copied from real output, artifact paths, lsp); the scripted integrity gate (§4) re-checks it + the canary echo; the coordinator judges the rest.")

Task(subagent_type: "security-verifier", prompt:
  "Verify ticket <TICKET>. Affected packages: <list>. Plan: ...plan.md. Static scan the diff.
   Write verify/security.json. Follow .claude/agents/security-verifier.md.
   CANARY: <CANARY> — echo verbatim in your return. Return an `evidence` block (commit SHA, counts
   copied from real output, artifact paths, lsp); the scripted integrity gate (§4) re-checks it + the canary echo; the coordinator judges the rest.")

Task(subagent_type: "build-check-verifier", prompt:
  "Build the AFFECTED packages only: <list>. Run UNDER THE PINNED TOOLCHAIN (mise exec --).
   Write verify/build-check.json. Follow .claude/agents/build-check-verifier.md.
   CANARY: <CANARY> — echo verbatim in your return. Return an `evidence` block (commit SHA, counts
   copied from real output, artifact paths, lsp); the scripted integrity gate (§4) re-checks it + the canary echo; the coordinator judges the rest.")

Task(subagent_type: "runtime-smoke-verifier", prompt:
  "Boot the AFFECTED packages only: <list>, under the pinned toolchain (mise exec --). SWEEP the
   ROOT route '/' AND every target screen/route <from plan/ACs> for runtime/console errors (no
   screenshot matrix — design-parity captures that in wave 2 against your ledgered services).
   RECORD the primary journey you drive (below) to .agentic/plans/<TICKET>/verify/recordings/
   (<flow>-journey.gif via Chrome MCP gif_creator, or .webm via a Playwright recordVideo context) —
   the recording is a REQUIRED artifact on a UI-journey ticket. PREFER DEPLOYED services (the real backend / Cognito / DB)
   over local: probe each needed deployed service at the START; if a needed one is UNAVAILABLE (down /
   no creds / no tunnel) emit a `human_blocker` that ASKS the owner — 'connect the deployed service
   (creds / tunnel / start it) OR proceed with a local setup?' — do NOT silently fall back to local and
   do NOT skip (local is used ONLY if the owner chooses it). If the owner chooses local, for backend
   packages: bring up the real backend services (e.g. `mise run docker-up`), verify containers
   (docker ps), exercise a real query — else human_blocker.
   For auth / external-service ACs, DETECT the available setup and pick the path — do NOT assume one
   emulator: (a) if a local emulator/service is configured (e.g. a cognito-local service + a local
   endpoint env), bring it up (e.g. `mise run cognito-up`) and exercise a real round-trip against it,
   noting results are emulator-only (NOT the real provider/prod path); (b) else if real provider creds +
   a usable test account are present in env, exercise the real provider; (c) else human_blocker naming
   which ACs stay unverified. Beyond screenshots, DRIVE the ticket's primary user journey end-to-end
   against the booted app (navigate → act → submit → assert the post-conditions the ACs state: new item
   in list, success message, real persistence) in ONE reused browser session — WEB via the Chrome MCP
   (real Chrome + session, the preferred driver; in Cursor use the built-in Browser tool — Chrome MCP
   is Claude Code-only) — a rendered page is not a working feature. Then run ONE failure-mode probe on the primary data screen (induce a fetch
   failure + reload): the screen must honestly signal the error, NOT render its empty/zero state as
   if the fetch succeeded — an empty-on-failed-fetch is a `fail_open_state` fixable finding. For
   mobile-affected tickets, DETECT a usable iOS Simulator / Android emulator, render there, and
   RECORD the mobile journey (`xcrun simctl io booted recordVideo` / `adb shell screenrecord`) per
   the agent file — a real device render, never a web substitute; no simulator/emulator available →
   inconclusive as before. Leave the sim booted + ledgered (design-parity captures its stills on it).
   List swept vs not-swept routes + verified services + the flow result. Classify failures
   ai_fixable vs human_blocker. Maintain the runtime ledger (verify/runtime-ledger.json, per
   .agentic/rules/_shared/leave-no-trace.md): check it BEFORE booting — reuse your still-healthy
   prior-pass services (rebuild first for build-serving servers) instead of stacking duplicates;
   ledger every spawn with its ACTUAL bound port + a teardown one-liner; capture against the ACTUAL
   port, never a hardcoded one; never touch unledgered (foreign) processes; report left_running.
   Write verify/runtime-smoke.json. Follow .claude/agents/runtime-smoke-verifier.md.
   CANARY: <CANARY> — echo verbatim in your return. RENDER-CANARY: <RENDER_CANARY> — the running app
   must actually DISPLAY it (or plant it in a fixture/seed); confirm it during the recorded journey —
   a journey where it never appeared is `inconclusive`, never a pass. Return an `evidence` block
   (commit SHA, counts copied from real output, artifact paths incl. the recording(s), lsp); the
   scripted integrity gate (§4) re-checks it + the canary echo; the coordinator judges the rest.")
```

Each verifier writes its JSON to `.agentic/plans/<TICKET>/verify/<agent>.json`.

### 3. Wave 2 — design-parity (captures + compares, against the still-running apps) + security-deep (conditional)

On a **fix-loop re-verify**, run wave-2 design-parity ONLY if `design-parity-verifier` is in `reverify_set` (a brand/parity finding was among those fixed); otherwise carry its prior report forward. `runtime-smoke` always re-runs on a re-verify, so the re-booted ledgered services are up when design-parity does re-run (it re-captures the fixed routes and carries its prior screenshots forward for untouched ones).

After wave 1 returns:

```
# design-parity CAPTURES the matrix itself against runtime-smoke's ledgered services, then compares to Figma
Task(subagent_type: "design-parity-verifier", prompt:
  "CAPTURE ticket <TICKET>'s rendered UI yourself and compare it to Figma. The affected apps are UP
   and ledgered (verify/runtime-ledger.json — use the ACTUAL ports/simulator recorded there; boot
   NOTHING yourself). Capture the ROOT route '/' AND every target screen, EACH in BOTH light and
   dark (plus mobile-width viewports when the design asserts responsive variants), to
   .agentic/plans/<TICKET>/verify/screenshots/ (<screen>-light.png / <screen>-dark.png). Mobile
   screens: capture on the LEDGERED simulator/emulator (simctl/adb + appearance toggle) — a web
   capture is never a mobile substitute. Then compare each capture to its Figma frame:
   .agentic/plans/<TICKET>/figma/. LOOP (fixable) on: stray app header on a header-less-design
   screen, broken dark mode, leftover framework-starter root, plus the brand-fidelity gaps.
   Affected UI packages: <list>. <On a re-verify: re-capture the fixed routes; carry prior
   screenshots forward under carried_forward for untouched ones.>
   Write verify/design-parity.json. Follow .claude/agents/design-parity-verifier.md.
   If a UI screen cannot be captured (service not ledgered/up, no sim, no auth path), report it
   INCONCLUSIVE (do NOT pass).
   CANARY: <CANARY> — echo verbatim in your return. RENDER-CANARY: <RENDER_CANARY> — confirm it in
   each capture's DOM/render; a capture missing it is inconclusive. Return an `evidence` block
   (commit SHA, counts copied from real output, artifact paths incl. every screenshot, lsp); the
   scripted integrity gate (§4) re-checks it + the canary echo; the coordinator judges the rest.")

# critical security?
security_report = read("verify/security.json")
if security_report has any finding with severity == "critical":
  Task(subagent_type: "security-deep-review", prompt: "Triage critical findings ...
    CANARY: <CANARY> — echo verbatim; return an `evidence` block the scripted integrity gate (§4) re-checks.")  # writes verify/security-deep.json
```

If the ticket touches no UI (e.g. backend-only), design-parity writes a `not-applicable` report (legitimately skipped — not a UI ticket). Only UI tickets require a rendered comparison.

### 4. Deterministic integrity gate (scripted — blocks the coordinator)

The mechanical evidence re-checks run as **code, not prose**. After all in-scope verifier reports
are on disk, run:

```bash
node .claude/scripts/verify-integrity.mjs reports .agentic/plans/<TICKET>/verify \
  --canary <CANARY> \
  [--expect <comma-list>]    # defaults to the full wave-1+2 roster; on a re-verify pass the SAME
                             # full roster is still expected (carried reports stay on disk)
  [--carried <comma-list>]   # re-verify only: expected − re-dispatched (prior-pass canary is OK there)
```

It validates every expected report (exists + parses + valid `status` + verbatim canary echo +
`evidence` block present), `git cat-file -e`s every claimed commit SHA, and stats every claimed
artifact path. It writes `verify/integrity.json` and exits non-zero on any failure.

- **exit 0** → dispatch the coordinator (§5), passing `verify/integrity.json`.
- **`missing_report` / `canary_mismatch`** → re-dispatch THAT verifier once (same canary), re-run the
  gate; a failure that persists is a `hallucination_flag` → ESCALATE.
- **`sha_not_found` / `artifact_missing` / `missing_evidence`** → `hallucination_flag` → the flagged
  verifier's work is re-done or ESCALATED — never PASS/LOOP on unverified evidence.

Do NOT dispatch the coordinator until this gate exits 0 (or the failure is being escalated to the
dev). Count cross-checks and internal-contradiction judgment stay with the coordinator — the script
owns exactly what a script can check.

After the coordinator returns, validate its own report the same way:

```bash
node .claude/scripts/verify-integrity.mjs coordinator .agentic/plans/<TICKET>/verify --canary <CANARY>
```

(non-zero exit → the coordinator return itself is suspect: re-dispatch the coordinator once, then
ESCALATE).

### 5. Dispatch the coordinator (opus)

```
Task(subagent_type: "coordinator", prompt:
  "Aggregate verifier reports for <TICKET>:
     verify/qa.json, verify/code-review.json, verify/security.json,
     verify/security-deep.json (if exists), verify/build-check.json,
     verify/runtime-smoke.json, verify/design-parity.json
   Screenshots: verify/screenshots/ (captured by design-parity, wave 2).
   Journey recordings: verify/recordings/ (from runtime-smoke).
   State: .claude/state/<TICKET>.json (retry counters).
   Affected packages: <list>.
   Follow .claude/agents/coordinator.md. Decide PASS | LOOP | ESCALATE.
   CANARY: <CANARY> — echo verbatim in your return.
   The deterministic integrity gate already ran — read verify/integrity.json; treat every recorded
   failure as a `hallucination_flag` (§1b). Then do the judgment checks the script can't: cross-check
   a sample of reported counts against the artifacts/files themselves, flag internally-contradictory
   reports, and RE-CHECK each verifier's evidence `lsp` block (see §LSP-enforcement re-check): if a
   verifier's task/diff touched `.ts`/`.tsx` and it did cross-file symbol navigation but reported
   `lsp.calls: 0`, raise a `process_gap` finding — LSP was mandated but ignored.
   Write verify/coordinator.json.")
```

### 6. Act on coordinator decision

```
read verify/coordinator.json

if decision == "PASS":
  state.phase = "verifying" → "review-ready"; return — driver advances to /handoff

elif decision == "LOOP":
  state.phase = "verifying" → "fixing"
  state.verify_findings = coordinator.fix_routing
  state.verify_retries  = coordinator.retry_counts
  return — driver dispatches /implement in fix-mode

elif decision == "ESCALATE":
  state.phase stays "verifying" (paused)
  surface the coordinator report to the dev with a conversational prompt, e.g.:

  "⏸ Verification escalated.
   Reason: <coordinator.escalation_reason>
   <if human_blocker>: Blocker(s) the workflow can't fix:
        • <what> → <exact remediation>   (ACs unverified: <list>)
   Findings: see .agentic/plans/<TICKET>/verify/coordinator.json
   Left running for your inspection (from verify/runtime-ledger.json):
     • <what> (<port/name>) — teardown: <one-liner>   (per-SERVICE, e.g. (THIS repo) `docker compose stop db && docker compose rm -f db`, `kill <pid>` — never whole-stack `mise run docker-down` unless every compose service is yours)
   Options:
     • clear the blocker and reply 're-verify'  (e.g. `mise run docker-up` then continue)
     • <suggested fix actions if any>
     • mark as accepted-risk and continue to /handoff (records the gap in the MR)"
  return — driver pauses for dev input
```

### 6a. Environment disposition (per `.agentic/rules/_shared/leave-no-trace.md`)

Read `.agentic/plans/<TICKET>/verify/runtime-ledger.json` — everything the verifiers (and earlier phases) started for this ticket. The coordinator decision picks the disposition; the signal is whether the flow comes back:

- **PASS** (moving forward to /handoff) → tear down every ledger entry via its recorded teardown command, confirm gone (port probe / `docker ps`), clear the ledger. An entry that is already dead = confirm gone + clear it, not an error (a crashed verifier leaves stale entries). Never touch anything not in the ledger.
- **LOOP** (returning to re-verify after fixes) → leave ledgered services UP for reuse — the re-verify reuses them instead of stacking duplicates (re-booting costs more than keeping them). Note `kept for re-verify: <list>` in the status output.
- **ESCALATE** (a human will inspect) → leaving the environment up is the RIGHT call so the dev can reproduce the failure live — but the pause message MUST include the "Left running for your inspection" block above. Never leave something running silently — left-up is a deliberate, reported state, not a default.

The §1 iteration-ceiling pause returns BEFORE this step ever runs — that path surfaces the ledger in its own pause message (see §1).

## Severity classification (delegated to coordinator)

See `.claude/agents/coordinator.md` for the full matrix. Summary:

| Severity | Behavior |
|---|---|
| `info` | Log, don't act |
| `fixable` | LOOP back to /implement (until cap) |
| `blocked` (human_blocker) | ESCALATE with remediation — NOT a code loop |
| `critical` | ESCALATE immediately |
| `architectural` | ESCALATE immediately |

A safety-relevant verifier (`runtime-smoke`, `design-parity`) reporting `skipped`/`inconclusive` on a ticket that touches runtime/UI is treated as ESCALATE — never an implicit PASS.

## LSP-enforcement re-check (Upgrade A — `process_gap`)

Every code-navigating verifier returns `lsp: { calls, usedFor }` in its evidence block. The coordinator RE-CHECKS it: if a verifier's diff/task touched `.ts`/`.tsx` and it did cross-file symbol / definition / reference / diagnostic navigation but reported `lsp.calls: 0`, that's a self-flagged **`process_gap`** finding — the agent leaned on Grep/Glob where the `LSP` tool was mandated. A `process_gap` is a fixable process finding (re-navigate via `LSP`), not a code defect; genuinely non-TS work legitimately reports `lsp.calls: 0` and is NOT flagged.

## Standalone mode

If invoked directly (not via /work) on a branch without active state: refuse unless `--standalone`. With `--standalone`: same waves + coordinator (including the §4 integrity gate — the coordinator runs it itself if the driver didn't), reports to `/tmp/verify-<timestamp>/`, **no state changes** — this holds whether or not the branch has an active ticket (an active ticket's re-check via `--standalone` is a read-only second opinion; only a `/work`-driven verify advances state or counters). There is no `.agentic/plans/<TICKET>/` dir in this mode, so the runtime ledger lives alongside the report dir — `/tmp/verify-<timestamp>/runtime-ledger.json` — with the same §6a disposition rules.

## When the loop must stop (coordinator owns this)

- Per-finding retry caps exceeded → ESCALATE
- `state.iterations.verify_loops >= state.max_verify_loops` (default 3) → ESCALATE the iteration-ceiling gate for dev approval (see §Iteration-ceiling guard)
- Critical / architectural finding → ESCALATE immediately
- human_blocker present → ESCALATE (surface remediation; do not loop)
- Oscillation (3+ cycles, toggling findings) → ESCALATE as `oscillation`

## Iteration-ceiling guard

Runtime boots are heavier than static checks; scope-awareness keeps them bounded (only affected packages boot, and a fix-loop re-verify re-runs only the fixed verifiers + build-check + runtime-smoke). The real, *trackable* guard against runaway loops is the iteration ceiling in state — **not** a dollar budget the workflow cannot actually measure.

`state.iterations` tracks `{ verify_loops, fix_dispatches }`; `state.max_verify_loops` defaults to **3**. Each verify pass increments `verify_loops` (see §Pre-flight). Before a fix-loop re-verify, if `verify_loops >= max_verify_loops`, surface the iteration-ceiling gate (per coordinator) and pause for dev approval — the dev may `raise ceiling N`, fix manually, or accept-risk and continue to /handoff.

A rough dollar estimate MAY be shown for awareness, but it is an estimate only and is **never** treated as an enforced budget:

```
⏸ Iteration ceiling reached: verify_loops 3 / 3. (Rough estimate only, not enforced: ~$8.90 so far.)
Left running for your inspection: frontend preview :4174 (kill 48212), postgres (docker compose stop db && docker compose rm -f db)
Reply 'raise ceiling 5' to continue, fix manually then 're-verify', or accept-risk → /handoff.
```
Wait for dev reply (this pause happens before §6a, so the ledger is surfaced here — see §1).

## Hard rules

- ❌ Skipping a verifier — `design-parity` is `not-applicable` only on genuinely non-UI tickets; `runtime-smoke` always runs on the affected packages.
- ❌ Aggregating before all verifiers return.
- ❌ Coordinator deciding PASS while any `critical`/`architectural` finding stands, while a `human_blocker` is unresolved, or while a safety verifier was `skipped`/`inconclusive` on a runtime/UI ticket.
- ❌ Suppressing critical findings because the dev seems annoyed.
- ❌ Pushing fixes through without /implement (fixes go through TDD too).
- ❌ Running any verifier outside the pinned toolchain (its green wouldn't be representative).
- ❌ Looping past retry caps without dev approval.
- ❌ Ending a verify pass without disposing of the runtime ledger per the coordinator decision — teardown (PASS), kept-for-reuse (LOOP), or reported-left-running (ESCALATE / iteration-ceiling pause). See §6a + `.agentic/rules/_shared/leave-no-trace.md`.
