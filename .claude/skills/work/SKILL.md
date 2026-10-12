---
name: work
description: The workflow driver. Reads ticket state and advances to the next phase automatically. The single command devs use day-to-day for ticket work. Usage — /work PROJ-123 to start a new ticket, or /work to continue the current one.
---

# /work — Workflow Driver

The **only daily command** for ticket work. Reads state, decides what's next, dispatches.

## Invocation patterns

| Form | Meaning |
|---|---|
| `/work PROJ-123` | Start a new ticket (or resume if state file already exists) |
| `/work` | Continue the active ticket on the current branch |
| `/work --status` | Print state, don't advance |
| `/work --reset` | Delete state file and start over (asks for confirmation) |

## Procedure

### 1. Determine ticket key

```
if user provided arg → use it
else:
  branch=$(git rev-parse --abbrev-ref HEAD)
  Extract PROJ-XXX from branch name (feat/PROJ-123-…, fix/PROJ-456-…)
  if no match → error: "No ticket key found. Run /work PROJ-XXX to start."
```

### 2. Load or create state

```
state_file=".claude/state/${TICKET}.json"

if [ ! -f "$state_file" ]:
   # First call for this ticket
   create state with phase="none", branch=(infer), created_at=now
else:
   # Continuing
   load existing state
```

State schema:

```json
{
  "ticket": "PROJ-123",
  "phase": "none|starting|planning|plan-review|implementing|verifying|fixing|review-ready|done",
  "branch": "feat/PROJ-123-stop-sequence",
  "base_branch": "develop",
  "exec_mode": "constrained|ample",
  "plan_dir": ".agentic/plans/PROJ-123",
  "plan": ".agentic/plans/PROJ-123/plan.md",
  "current_task": "t3",
  "iterations": {
    "verify_loops": 0,
    "fix_dispatches": 0
  },
  "max_verify_loops": 3,
  "verify_retries": {
    "test_failure": 0,
    "type_error": 0,
    "security_finding": 0,
    "ac_unmet": 0,
    "convention_violation": 0,
    "design_parity": 0,
    "build_failure": 0,
    "runtime_failure": 0,
    "process_gap": 0
  },
  "design_decision": "auto-propose|clarify|inline-override|null",
  "foundation_decision": "split|bounce|force-proceed|null",
  "verify_findings": null,
  "history": [
    { "phase": "starting", "ts": "...", "duration_s": 0, "summary": "..." }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

All plan artifacts live in `.agentic/plans/<TICKET>/` (per-ticket subfolder):

```
.agentic/plans/<TICKET>/
├── plan.md
├── plan.v1.md, plan.v2.md   # past versions (when regenerated)
├── raw.json                 # raw Jira ticket
├── exploration.md           # explorer subagent output
├── overrides.md             # DoR bypass notes (if any)
├── handoff.md               # MR/PR title + description
├── figma/<frame-id>.json
└── verify/
    ├── qa.json
    ├── code-review.json
    ├── security.json
    ├── security-deep.json   # only if critical findings escalated
    ├── design-parity.json
    ├── build-check.json
    ├── runtime-smoke.json   # (one report per verifier — the roster is defined in verify/SKILL.md)
    ├── screenshots/         # route × theme stills captured by design-parity (wave 2, against the ledgered apps)
    ├── recordings/          # journey videos/GIFs recorded by runtime-smoke (watch what the agent did)
    ├── runtime-ledger.json  # processes/services the flow started (see .agentic/rules/_shared/leave-no-trace.md)
    └── coordinator.json
```

### 2b. Probe host RAM once per pass — set execution mode

Probe host RAM **ONCE** at the start of each `/work` pass and record the classification in state — every heavy step downstream (the verify waves, `/implement-plan` spawns, boots/bundles) reads `state.exec_mode` instead of re-probing:

```bash
# total GB
node -e "console.log(Math.round(require('os').totalmem()/1e9))"
# free % — macOS:
memory_pressure | grep 'free percentage'
# free % — linux:
free
```

Classify and record:

- **CONSTRAINED** — host total ≤ ~18 GB (on this 16GB fanless Mac a parallel verifier wave + concurrent spawns OOM-crashes it). Downstream runs **sequential + capped**: `/verify` runs wave-1 verifiers one at a time (§execution-mode branch in `verify/SKILL.md`), every node command capped `NODE_OPTIONS=--max-old-space-size=1536`, `jest --maxWorkers=2`, ONE task-implementer / spawn at a time, a **cooldown gate** (free mem ≥ ~45% before the next heavy step), boot/bundle steps one at a time, and delegate-then-ground-truth over parallel fan-out.
- **AMPLE** — otherwise. The existing parallel waves + concurrent spawns, unchanged.

Write `exec_mode: "constrained" | "ample"` (plus the probed total GB + free %) into state. The state value is stored **lowercase** (`"constrained"` | `"ample"`) and maps 1:1 to the uppercase **CONSTRAINED** / **AMPLE** mode names used in prose here and downstream (`verify` §1a, `implement`). This is a **MODE branch, not a rewrite** — the wave composition, verifier roster, and gates are identical in both modes; only parallel-vs-sequential dispatch + the resource caps differ.

### 3. Dispatch based on phase

| Current phase | Action | Next phase | Gate? |
|---|---|---|---|
| `none` | Run `/start` skill | `starting` | only if DoR/design/foundation needs clarification |
| `starting` (succeeded) | Run `/plan` skill (explorer → planner → plan-reviewer) | `plan-review` | always pauses here for dev approval |
| `starting` (paused for clarification) | Wait for dev's chat answer; resume per their input | stays | yes |
| `plan-review` | Wait for dev's answer ("approve" / changes / edits-then-go) | `implementing` or re-plan | yes |
| `implementing` | Dispatch `/implement-plan` — loops through tasks until exhausted | `verifying` | no |
| `verifying` | Dispatch `/verify` (the verifier set defined in `verify/SKILL.md` — wave-1 in parallel, then design-parity, then the opus coordinator) | `review-ready` / `fixing` / pause | only if coordinator says ESCALATE |
| `fixing` | Dispatch `/implement-plan` in fix-mode with verifier routing | `verifying` (re-runs) | no |
| `review-ready` | Dispatch `/open-mr` — opens MR/PR | `done` | no |
| `done` | Tell dev ticket is complete | stays | yes |

**Key**: gates pause the loop and surface a question to the dev. Everything else continues automatically in the same `/work` call.

### 4. After dispatch — update state

After each sub-skill returns:

1. Read the sub-skill's return value (success/failure + summary)
2. **Integrity check (see [Dispatch integrity](#dispatch-integrity--canary--evidence-tokens))** — confirm the return echoes this pass's canary token verbatim AND re-check its evidence tokens. The SHA check is scripted — `node .claude/scripts/verify-integrity.mjs shas <sha> [<sha>...]` on each claimed commit — plus spot-cross-check one reported count and confirm a claimed artifact path exists. (For the `verifying` phase the full report re-check is the scripted gate in `verify/SKILL.md` §4 — don't duplicate it here.) A missing/altered canary or a failed re-check → re-dispatch (or raise a `hallucination_flag` → escalate); do NOT advance phase on an unverified return.
3. Mutate state through `.claude/scripts/state-update.mjs` — NEVER hold state in memory across a
   dispatch and write it back whole. The post-tool-use hook appends commit entries to `history`
   through the same script while sub-skills run; an in-memory write-back would clobber them. The
   script locks, re-reads fresh, mutates, and atomically renames — one call per logical change:

   ```bash
   node .claude/scripts/state-update.mjs "$state_file" append-history --summary "<what happened>"
   #   ↳ ts is stamped and duration_s is computed automatically (per-phase telemetry)
   node .claude/scripts/state-update.mjs "$state_file" set phase=verifying current_task=null
   node .claude/scripts/state-update.mjs "$state_file" incr iterations.verify_loops verify_retries.test_failure
   node .claude/scripts/state-update.mjs "$state_file" set 'verify_findings=<json>'   # JSON values parse as JSON
   ```

   (`updated_at` is touched by every mutation; `get [<dot.path>]` reads without locking.)
4. If phase advanced and we're NOT at a gate, loop back to step 3 (dispatch the next phase)

### 4a. Gate prompts — mode-based decisions + always-clarify

Every gate has the same shape: **structured numbered options + a free-form clarification field**. The dev picks an option AND can add freeform context. This pattern came from the bounce/split/force-proceed gate; we apply it everywhere.

#### Plan-review gate

```
⏸ Plan ready → .agentic/plans/<TICKET>/plan.md

📋 Summary
   • <N> tasks (<M> code, <K> foundation, <L> migration, <P> environment)
   • AC coverage: <X>/<Y>
   • Estimated cost: <low|medium|high>

❓ Blocking questions
   Q1 — <text>
   Q2 — <text>

Your decision:
  1. Approve as-is (defaults apply for blocking Qs)
  2. Approve with answers — write Q1/Q2 answers inline below
  3. Regenerate plan — describe new constraints inline below
  4. Pause — I'll come back later (you can also just say "later")

Anything else? Free-form: clarifications, constraints, risks I should know about, references, or just thinking out loud. (Leave blank to proceed with your decision above.)
```

Driver interprets:
- "1" / "approve" / "yes" / "go" → defaults for blocking Qs, advance to implementing
- "2" + answers → write answers into plan.md's Open Questions section, advance
- "3" + constraints → invoke /plan again with the new constraints
- "4" / "later" → save state, exit; dev resumes by saying "continue" or `/work` later
- Any text in the free-form section → treat as additional context: write to plan.md as a "Dev clarification" note + factor into the next phase

#### Foundation-decision gate (from /start)

```
⚠ Foundation gaps detected for <TICKET>:
   <list of cross-cutting primitives missing>

Note: These are missing primitives that would block ANY feature ticket, not
ticket-specific work. Ticket-specific work (new entities, new IaC modules,
etc.) is handled in the plan as normal tasks.

Your decision:
  1. Bounce — close this ticket, create foundation ticket(s) first (recommended)
  2. Split — fold foundation tasks into the current plan, marked type=foundation
  3. Force-proceed — proceed against stubs (expect design/auth mismatch)
  4. Pause — let me investigate

Anything else? Free-form context (the dev's reasoning, related tickets, constraints).
```

Driver writes the decision + any clarification to `state.foundation_decision` + the plan's notes section, then continues.

#### DoR-clarification gate (from /start)

```
⏸ Ticket <TICKET> is not Ready for Development.
   Missing: <list>

Your decision:
  1. Bounce back to BA — I'll draft a Jira comment listing what's missing
  2. Fill in inline — paste the missing info in the free-form field below; I'll
     save as overrides and proceed
  3. Force-proceed (NOT recommended) — plan quality will suffer

Anything else? Free-form: the BA's context, related tickets, why the ticket looks the way it does, anything I should know.
```

#### Design-completeness gate (from /start)

```
⏸ Design has gaps:
   <list: missing states, missing responsive variants, missing annotations>

Your decision:
  1. Auto-propose — I propose missing states based on existing design system patterns
  2. Clarify — I draft Figma + Jira comments for designer / BA, workflow pauses
  3. Inline override — describe what should happen in the free-form field below
  4. Force-proceed — proceed against the partial design (NOT recommended for UI tickets)

Anything else? Free-form: the dev's intuition about what the missing states should look like, links to similar designs, design system references.
```

#### Figma-scope-confirmation gate (from /start)

```
🎨 Figma exploration found related frames besides the anchor URL:
   Anchor: <frame name + URL>
   Also relevant (same page, naming match):
     • <frame name + 1-line description>
     • <frame name + 1-line description>
   Other pages I checked: <list>

Your decision:
  1. Use this set — these are all the frames I should consider
  2. Drop some — describe which inline below
  3. I need more — describe where else to look (other pages, other files)
  4. Skip Figma — proceed without design references (for non-UI tickets)

Anything else? Free-form: which states matter most, which to ignore, parts of the design that aren't in scope.
```

#### Verifier-escalation gate

```
⏸ Verification escalated.
   Reason: <coordinator.escalation_reason>
   See: .agentic/plans/<TICKET>/verify/coordinator.json
   Left running for your inspection (from verify/runtime-ledger.json):
     • <what> (<port/name>) — teardown: <one-liner>
   (read the ledger; no live entries → "nothing left running")

Your decision:
  1. Apply the suggested fix — coordinator's recommendation
  2. Describe a different approach inline below
  3. Accept the risk and continue to /open-mr (adds "skip-verify" label on MR)
  4. Pause — let me investigate

Anything else? Free-form: dev's interpretation of the finding, related context, why we should/shouldn't act on it.
```

#### Iteration-ceiling gate (honest work-iteration guard, not a $ budget)

The driver cannot read real $ spend, so the guard is a TRACKABLE iteration ceiling
(`state.max_verify_loops`, default 3) on verify→fix loops. The coordinator raises this
when `state.iterations.verify_loops` would exceed the ceiling.

```
⏸ Iteration ceiling reached for <TICKET>.
   verify_loops = <state.iterations.verify_loops> / max_verify_loops = <state.max_verify_loops>
   (fix_dispatches so far: <state.iterations.fix_dispatches>)
   The flow has re-verified this ticket the maximum number of times without a clean PASS.
   (Rough estimate only, NOT enforced: ~$<approx> spent.)
   Left running for your inspection (from verify/runtime-ledger.json):
     • <what> (<port/name>) — teardown: <one-liner>
   (read the ledger; no live entries → "nothing left running")

Your decision:
  1. Raise ceiling — reply "raise ceiling <N>" to set max_verify_loops and continue
  2. Inspect & fix manually — see .agentic/plans/<TICKET>/verify/coordinator.json, then "re-verify"
  3. Accept-risk → /open-mr — open the MR with the remaining gaps documented
  4. Pause — save state, resume later

Anything else? Free-form.
```

#### Done

```
✓ Ticket <TICKET> done. MR: <url>

⚠ Deployment Prerequisites (handoff to deployer or CI):
   □ <item 1>
   □ <item 2>

🧹 Environment: <torn down from verify/runtime-ledger.json: <list> | "nothing was left running">

No more decisions needed. Hand off to a teammate for code review.
Anything else before I close this out? (Free-form: notes for retrospective, follow-up tickets to draft, etc.)
```

### 4b. How the dev's answer is parsed

For any gate, the driver:

1. Read the dev's reply
2. Detect the chosen option number (or keyword: "approve" / "yes" → 1, "bounce" → 1, "later" / "pause" → matching option, etc.)
3. Extract any inline content (after "with answers" / "with constraints" / "describe inline")
4. Capture the "Anything else?" free-form text separately as a clarification note
5. Write the clarification note into the plan/state (under "Dev clarifications" section) — preserved for traceability
6. Continue the loop based on the chosen option + clarification

If the reply is ambiguous (e.g., dev wrote prose without explicitly picking a number), ask one clarifying question with the same gate format. If still unclear, do the conservative thing (treat as "pause"; never auto-advance on uncertainty).

### 4c. Two valid answer paths for plan-review specifically

| Path | Detection |
|---|---|
| **Answer in chat** | Dev's reply contains structured answers like "Q1: yes, add audit log. Q2: 4 seconds." → driver writes these to plan.md's Open Questions section, then advances |
| **Edit plan.md directly** | Dev says "I edited the plan, continue" or "go" → driver re-reads plan.md to capture changes, then advances |

### 5. Continuous execution — run until a gate or completion

**This is the single most important rule of the driver.** One `/work` call runs as far as it can — through every phase that doesn't require human input — until it hits a **gate**. The dev should only need to type `/work` two or three times for a full ticket: once to start, once after reviewing the plan, and possibly once more if the verifier escalates.

**The driver loops automatically:** after a sub-skill completes successfully, immediately dispatch the next phase's sub-skill in the same `/work` invocation. **Do NOT return control to the dev between every phase.**

#### Loop shape

```
function work(ticket):
  loop:
    phase = read_state()
    if phase in GATES: pause and return  # human input required
    if phase == "done": tell dev "ticket complete" and return
    next_skill = phase_to_skill[phase]
    result = run(next_skill)
    if result is failure that needs human: pause and return
    update_state(phase = next)
    continue loop  # ← keep going, don't return to dev
```

#### Gates — the ONLY places the driver pauses for the dev

1. **DoR / design clarification needed** in `/start` (missing required ticket fields, design gaps with no clear default)
2. **Plan review** after `/plan` produces `plan.md` (phase = `plan-review`; dev approves or requests changes)
3. **Verify escalation** when retry cap hit or critical/architectural finding (phase stays `verifying`)
4. **MR opened** after `/open-mr` succeeds (phase = `done`)
5. **Iteration ceiling reached** (verify→fix loops hit `max_verify_loops` — see the iteration-ceiling gate)

Anything else — phase transitions, task switches in `/implement-plan`, verifier passes — happens silently inside the loop. The dev sees one long sequence of tool calls and a final summary.

#### Example — one `/work` call covers many phases

Dev runs `/work BEO-19` on a clean branch:

```
[workflow] BEO-19 — Edit follow-up emails in lead profile
  Branch: feat/BEO-19-edit-follow-up-emails (creating...)
  Phase: none → starting

▸ /start dispatching
  ✓ ticket fetched via internal-jira
  ✓ DoR validation passed
  ✓ Figma frame fetched
  ✓ design completeness check passed
  ✓ branch created
  ✓ state initialized

▸ /plan dispatching (continuing in same /work call)
  ✓ explorer subagent mapped 12 relevant files
  ✓ planner produced .agentic/plans/BEO-19.md
  ✓ AC coverage: 17/17 ACs covered by 6 tasks

  Phase: planning → plan-review

⏸ PAUSED — plan ready for your review.
   Review .agentic/plans/BEO-19.md, then:
   • approve: run /work
   • request changes: tell me what to adjust and I'll regenerate
```

That's ONE `/work` call. It covered `none → starting → planning → plan-review`. Then it paused because plan-review is a human gate.

Dev reviews, then says "approve" or runs `/work`:

```
▸ /implement-plan dispatching (6 tasks)
  ▸ t1: Add stopSequence mutation (backend) ... ✓ committed e3a9b2c
  ▸ t2: Add useStopSequence hook (frontend) ... ✓ committed 7f1d4a8
  ▸ t3-t6: ... ✓ all committed

▸ /verify dispatching (wave-1 verifiers in parallel — roster per verify/SKILL.md)
  ✓ qa: 17/17 ACs covered, all tests passing
  ✓ code-review: no convention violations
  ✓ security: clean
  ✓ build-check: all affected packages compile clean
  ✓ runtime-smoke: apps boot; routes swept clean; primary journey driven + recorded
  ✓ design-parity (wave 2): matrix captured light/dark; all states match Figma

  Phase: verifying → review-ready

▸ /open-mr dispatching
  ✓ pushed feat/BEO-19-edit-follow-up-emails
  ✓ opened MR: https://gitlab.geniusee.com/.../merge_requests/42
  ✓ Jira ticket transitioned to "In Review"

  Phase: review-ready → done

✓ Done. Ticket BEO-19 is now in review. Hand off to a teammate.
```

That's the SECOND `/work` call. It covered `plan-review → implementing → verifying → review-ready → done`. Five phase transitions in one invocation.

**Total dev keystrokes for a clean ticket: two `/work` calls.** That's the target.

#### When the loop must stop

Stop inside the loop and pause if:

- A sub-skill returns `status: needs-human` (DoR failure, design gap, plan validation error)
- Verifier classifies a finding as critical, architectural, or cap-exceeded
- Iteration ceiling reached (verify_loops ≥ max_verify_loops)
- Sub-skill took an unexpected action (e.g., wrote a file outside the declared task scope)
- Dev interrupted

On every pause, surface a clear status header:

```
⏸ PAUSED at <phase>
   Reason: <human-readable>
   To continue: <action>
   Left running: <live entries from verify/runtime-ledger.json + teardown one-liners, when any>
```

#### Do NOT pause for:

- Phase transitions inside the happy path
- Task switches inside `/implement-plan` (each task auto-commits and the next one starts)
- Verifier re-runs inside the fix loop (under cap)
- "Progress updates" — those go to the status header, not as pause points

**Anti-pattern:** "I just ran /start, now waiting for you to tell me to run /plan." Wrong. The driver runs start → plan in the same invocation. The dev sees status updates as the work progresses and only types again at a gate.

### Environment sweep — the driver owns FINAL disposition

Per `.agentic/rules/_shared/leave-no-trace.md`: /verify disposes per-pass (keyed to the coordinator decision); the driver disposes at **run boundaries**, reading `.agentic/plans/<TICKET>/verify/runtime-ledger.json`:

- **phase → done** (after /open-mr): tear down every remaining ledger entry via its recorded command, confirm gone, clear the ledger; list what was cleaned in the done message. An entry already dead = confirm gone + clear it, not an error.
- **`/work --reset`**: sweep the ledger BEFORE deleting state — "start over" severs the run's ownership context, so any service left running would be inherited by the next run as an unowned leftover.
- **any pause for a human** while ledger entries are alive: the pause header lists what is left running + its one-line teardown (the verify-phase gate templates above already include this; other gates rarely have live services, but check).

Never touch processes/containers not in the ledger — they're the dev's own environment.

## Dispatch integrity — canary + evidence tokens

The driver is the most context-heavy component in the flow, so it BOTH plants the integrity checks and re-checks what comes back — it never trusts a subagent / sub-skill return at face value.

### Planted canary (proves the return processed THIS real dispatch)

At pass start the driver generates ONE unique token — `CANARY-<random-word>-<4 digits>` (e.g. `CANARY-lantern-4821`) — and injects it **verbatim** into EVERY dispatch prompt it sends this pass (each sub-skill, and transitively every subagent those sub-skills spawn). Every dispatched sub-skill / subagent MUST echo the canary token verbatim in its return — proof it processed THIS real dispatch, not a stale or fabricated response. A missing or altered canary → the return is suspect → re-dispatch it.

For **runtime-smoke** and **design-parity**, the driver also mints a **render-canary** (the SAME token to both) that the running app must actually display (or runtime-smoke plants in a fixture) — runtime-smoke confirms it during the recorded journey, design-parity in each still it captures — proving a REAL render, not a fabricated recording/screenshot. A render-canary absent from the recording/capture → `inconclusive`, never a pass.

### Evidence tokens (machine-checkable, re-checked by the driver)

Every sub-skill + subagent returns an `evidence` block with numbers **COPIED from real command output** (never estimated): the commit SHA(s) it created (`git rev-parse HEAD` / the commit hash), exact counts from its own runs (tests passed/failed, build exit code, files changed), artifact paths, and `lsp: { calls, usedFor }` on any code-navigating work (per the LSP-enforcement rule in `verify/SKILL.md`).

The driver **RE-CHECKS** a sample of every return — this is the teeth, and the mechanical parts are
scripted so the gate isn't the same substrate it guards:

- `node .claude/scripts/verify-integrity.mjs shas <sha> [...]` — every claimed commit SHA must exist (scripted `git cat-file -e`)
- for the `verifying` phase, the FULL report re-check is `verify-integrity.mjs reports` (see `verify/SKILL.md` §4) — run before the coordinator, and `verify-integrity.mjs coordinator` after it returns
- spot-re-run or cross-check a reported count (e.g. re-read `verify/qa.json`, re-count changed files with `git diff --name-only`) — judgment, stays with the driver
- confirm a claimed artifact path exists on disk (scripted inside `reports` mode; stat it yourself for non-verify returns)

A claimed SHA that doesn't exist, or a count that contradicts the re-check → raise a `hallucination_flag` → the work is re-done or ESCALATED, never trusted. A TS-navigation return reporting `lsp.calls: 0` is a `process_gap` (the coordinator/verify owns that classification — see `verify/SKILL.md`).

### The driver's own evidence block

Because `/work` is itself a context-heavy pipeline skill, it self-evidences: its final report surfaces an `evidence` block with the commit SHAs the pass produced (copied from `git rev-parse`), the verify counts it re-checked, and the artifact paths under `.agentic/plans/<TICKET>/`. Numbers are copied from real output, never recalled.

## Behavior on edge cases

### Branch / state mismatch

If `git branch` says `feat/PROJ-123-…` but no state file → state was lost. Offer:

1. Recreate from current branch (start over)
2. Bail out — maybe wrong branch

### Multiple active tickets (multiple state files)

Match by branch name. If branch ≠ feat/PROJ-X, ask which ticket.

### Dev not on a feature branch (on `main` or `develop`)

If `/work PROJ-123` and current branch is `main`: create `feat/PROJ-123-<slug>` and switch. Slug comes from the ticket summary.

### State says `done` but dev runs `/work`

Ask if they want to start a new ticket or re-open this one (`--reset`).

## Output style

Every `/work` invocation prints a compact status header before dispatching:

```
[workflow] PROJ-123 — Stop Sequence Button
  Branch: feat/PROJ-123-stop-sequence-button
  Phase:  implementing → verifying (advancing)
  Task:   t4 / 4 done
```

Then dispatches the sub-skill. The sub-skill produces its own detailed output.

## When verifier finds fixable issues

```
  → /verify: qa agent reports 2 failing tests, reviewer reports 1 style issue
  → coordinator classifies: both fixable
  → state: verifying → fixing, verify_retries.test_failure = 1
  → /implement-plan --fix-mode applies fixes
  → state: fixing → verifying
  → /verify re-runs
  → green this time → review-ready
```

## When verifier escalates

```
  → /verify: security agent reports a hardcoded API key in t3
  → coordinator classifies: security finding
  → verify_retries.security_finding = 1 (cap is 1)
  → state stays at verifying, but driver pauses
  → driver: "⚠ Security finding requires human review. See report at ..."
```

## Hard rules

- ❌ Never edit state.json by hand from inside a skill (the driver owns it) — and the driver itself mutates ONLY via `.claude/scripts/state-update.mjs` (locked + atomic; the post-tool-use hook writes through the same path). Never read-modify-write the file whole from memory.
- ❌ Never call a phase-specific skill (`/plan`, `/implement-plan`, `/verify`, `/open-mr`) directly from `/work` outside its proper phase
- ❌ Never advance phase without the sub-skill confirming success
- ❌ Never silently bypass a human gate
- ❌ Never reach `done` or execute `--reset` while flow-started services from the ticket runtime ledger (`.agentic/plans/<TICKET>/verify/runtime-ledger.json`) are still running and unreported — sweep them (or list them with teardown one-liners) first
