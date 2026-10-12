# Spec-driven Workflow — Onboarding

This monorepo ships a standardized **spec-driven development workflow** that runs in **Claude Code or Cursor** — same skills, same subagents, same hooks, same state files. This doc walks you from `git clone` to running `/work` on your first ticket in either harness.

## TL;DR

```bash
git clone <this-repo>
cd <this-repo>
mise install                  # pinned toolchain: node 22.22, pnpm 9.15, jq, direnv, typescript-language-server
mise run bootstrap            # corepack + per-app deps + setup-claude.sh (Jira PAT) + direnv allow
# Launch YOUR harness from a shell where `echo $JIRA_PAT` prints a value, then:
#
#   Claude Code → accept workspace/marketplace/plugin prompts → /mcp (Figma OAuth) → /work PROJ-123
#   Cursor      → /add-plugin superpowers → Figma OAuth on first MCP use     → /work PROJ-123
```

Total time: ~10 min one-time. Harness-specific steps: [In Claude Code](#in-claude-code) · [In Cursor](#in-cursor).

---

## What the workflow gives you

| Phase | Skill | What it does | Human gate? |
|---|---|---|---|
| Start | `/start TICKET` | Fetches ticket from Jira, validates DoR, fetches Figma, checks design completeness | Only if validation fails — dev clarifies |
| Plan | `/plan` (auto) | Explorer subagent maps relevant code; planner writes `plan.md` with bounded tasks | ✅ **Dev reviews plan** |
| Implement | `/implement-plan` (auto) | Subagent-per-task with TDD; commits per task | No |
| Verify | `/verify` (auto) | Wave 1: `qa` + `code-review` + `security` + `build-check` + `runtime-smoke` (records the driven journey) in parallel; wave 2: `design-parity` captures the route × theme matrix + compares to Figma (roster defined in `verify/SKILL.md`) | No (coordinator routes fixes back) |
| Handoff | `/open-mr` (auto) | Opens MR (GitLab) or PR (GitHub) with structured description | ✅ **Code review by teammate** |

The single command devs use day-to-day is `/work`. It runs **continuously** — one invocation drives through every phase until it hits a human gate. Expect roughly **two `/work` calls** for a clean ticket:

1. `/work PROJ-123` → drives `start → plan` → pauses at plan-review for your approval
2. `/work` (after you approve the plan) → drives `implement → verify → handoff` → opens the MR

The state of where you are lives in `.claude/state/<ticket>.json` and survives session restarts. You never need to remember which sub-skill to call — the driver picks based on state.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node | ≥22 | `mise install node@22` (mise.toml pins it) |
| pnpm | ≥9 | `mise install pnpm@9` |
| Claude Code — or | latest | https://claude.ai/code |
| Cursor | ≥2.5 (skills + subagents + plugins) | https://cursor.com/download |
| direnv | any recent | `brew install direnv` — loads env vars from `.envrc` into your shell |
| jq | any recent | `brew install jq` (macOS) or apt/yum |
| Git | ≥2.40 | system default usually fine |

**direnv shell hook** must be installed in your `~/.zshrc` (or `~/.bashrc`):

```bash
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
# then: exec zsh
```

The `setup-claude.sh` script verifies Node/pnpm/jq.

---

## Setup walkthrough (`./scripts/setup-claude.sh`)

The script is idempotent — re-run any time. It handles:

### 1. `internal-jira-mcp`

Our internal MCP server that wraps Jira Server/DC and Cloud. The script clones it (or uses an existing local copy), builds it, and saves its path to `.claude/.env`.

If you don't have access to the internal-jira-mcp repo yet, the script skips this step gracefully — but `/start` won't work until it's installed.

### 2. Jira PAT

For Jira Server / Data Center (default for this monorepo):

1. Go to `<JIRA_BASE_URL>/secure/ViewProfile.jspa` → **Personal Access Tokens**
2. Click **Create token**, name it `mcp-local`, 365-day expiry, no extra scopes
3. Copy the token — it's only shown once
4. Paste it into the prompt

For Jira Cloud: generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens and supply your Atlassian email + token.

Stored in `.claude/.env` (chmod 600, gitignored).

### 3. Figma MCP

Uses the **remote Figma MCP** at `mcp.figma.com`. No Dev Mode seat or paid plan required — works on all Figma plans.

Auth happens via OAuth on first use:
1. Open Claude Code
2. Run `/mcp` — it'll detect the figma server and prompt you to authenticate
3. Click the auth link, log in to Figma in your browser
4. Token is stored by Claude Code; no manual env vars needed

For frame context, you'll paste Figma URLs directly into the workflow (e.g., the URL on a Jira ticket). The remote MCP fetches the design data from the URL.

If you can't access Figma at all, skip — `design-parity` verifier will no-op.

### 4. App `.env` files

The script copies `.env.example → .env` for each of `backend/`, `frontend/`, `mobile/expo-boilerplate/`. **You fill in values from the team password manager.** They're gitignored.

### 5. `.agentic/scripts` deps

Installs deps for the `sync.ts` codegen script (regenerates Cursor rules + CLAUDE.md symlinks).

### 6. Allow direnv

The repo ships a `.envrc` that loads `.claude/.env` via direnv. After `setup-claude.sh` writes the env file, you must allow it once:

```bash
direnv allow
```

`direnv status` should then show the .envrc as loaded. `echo $JIRA_PAT` should print your token. Without this step, Claude Code's MCP servers won't see the env vars and `/mcp` will warn about missing variables.

---

## In Claude Code

After `setup-claude.sh` + `direnv allow`:

1. **Launch Claude Code from a shell where direnv has loaded the vars.** Verify with `echo $JIRA_PAT`. If you launched the IDE from Finder/Spotlight, it won't inherit your terminal env — close it and re-launch from terminal (`code .` / `cursor .`).
2. **Open this repo**, trust the workspace when prompted.
3. **Trust the marketplace**: Claude Code sees `extraKnownMarketplaces` in `.claude/settings.json` and asks whether to trust `claude-plugins-official` — say yes.
4. **Install project plugins** — they're declared in `.claude/settings.json`, so Claude Code prompts you automatically when you trust the repo. Accept, or run explicitly, then `/reload-plugins`:
   ```
   /plugin install superpowers@claude-plugins-official        # brainstorming + TDD primitives
   /plugin install typescript-lsp@claude-plugins-official      # LSP navigation/diagnostics — cuts subagent context-search effort
   /plugin install security-guidance@claude-plugins-official   # continuous in-session security review
   ```
   `typescript-lsp` needs the `typescript-language-server` binary — `mise install` already provides it (declared in `mise.toml`).
5. **Verify MCPs**: `/mcp` — `internal-jira` + `figma` are pre-enabled in committed `settings.json`. `internal-jira` shows ✓ connected; `figma` prompts for OAuth on first use (browser pop-up to figma.com — no token needed).
6. **You're ready.** Pick a ticket and run `/work PROJ-XYZ`.

---

## In Cursor

Same shared setup (`setup-claude.sh` + `direnv allow` — Cursor reuses `.claude/.env`). Then:

1. **Launch Cursor from the direnv-loaded shell** (`cursor .`). Verify `echo $JIRA_PAT` prints a value first — a Finder/Spotlight launch doesn't inherit terminal env, and the `internal-jira` server path (`INTERNAL_JIRA_MCP_PATH`) is resolved from the shell env.
2. **Skills, subagents, rules, hooks need no install.** Cursor compat-loads `.claude/skills/` directly, uses the generated `.cursor/agents/` + `.cursor/rules/`, and runs the same hook scripts via `.cursor/hooks.json`. `/work` is in the `/` menu out of the box.
3. **Models — Claude by default.** In Cursor the flow's 13 subagents are pinned to the same Claude tiers Claude Code uses: `opus → claude-opus-4-8`, `sonnet → claude-sonnet-5`, `haiku → claude-4.5-haiku`. **To change this** (e.g. run tiers on `gpt-5.5` or `composer-2.5`), edit `CURSOR_MODEL_MAP` in [.agentic/scripts/sync.ts](../.agentic/scripts/sync.ts), then `cd .agentic/scripts && pnpm sync` to regenerate `.cursor/agents/`. The top-level `/work` session itself runs on whatever you pick in Cursor's model dropdown — set it to **`claude-sonnet-5`** (the driver executes the skill procedures; it needs Claude-grade instruction-following, and Sonnet matches the Claude Code baseline). Avoid **Auto** for workflow runs: it routes per-request to varying cheaper models mid-state-machine. Opus is unnecessary here — the flow already pins Opus where judgment matters (plan-reviewer, coordinator, security-deep-review).
4. **Superpowers plugin**: project-scope enablement is already committed in `.cursor/settings.json` (`{"plugins": {"superpowers": {"enabled": true}}}` — written by `/add-plugin superpowers` when it was first installed). The plugin *content* caches per-machine under `~/.cursor/plugins/cache/`, so on a fresh machine: open the repo, and if the superpowers skills don't appear, run `/add-plugin superpowers` once in Agent chat. You can't silently miss it — the session-start hook nudges whenever the plugin isn't actually present on the machine.
5. **MCP**: the committed `.cursor/mcp.json` is picked up on open (Cursor currently enables project servers by default; each tool *call* still asks for approval). `figma` prompts OAuth in the browser on first use, same as Claude Code.
6. **Deliberately NOT installed in Cursor** — native equivalents exist: `typescript-lsp` (Cursor has built-in code intelligence), `playwright` (built-in Browser tool; the verifiers' `mise exec -- playwright` fallback also works unchanged), `security-guidance` (the flow's security verifiers cover in-flow review).
7. **You're ready.** `/work PROJ-XYZ` — same driver, same `.claude/state/` files, same human gates. You can even switch harness mid-ticket; state is shared.

Config layout and what's generated vs authored: [.cursor/README.md](../.cursor/README.md). One caveat: the headless `agent` CLI doesn't run hooks — there, the IaC-apply ban is enforced by `.cursor/cli.json` deny rules instead.

---

## Daily workflow

```
1. git checkout main && git pull
2. /work PROJ-XYZ
     → fetches Jira ticket, validates DoR, fetches Figma frame
     → explorer maps relevant code
     → planner writes .agentic/plans/PROJ-XYZ.md
     → driver pauses at plan-review

3. Review .agentic/plans/PROJ-XYZ.md. Either:
     • "approve" → continue
     • describe changes → driver regenerates the plan

4. /work
     → implements every task with TDD, one subagent per task
     → runs verification (wave 1: qa, code-review, security, build-check, runtime-smoke;
       wave 2: design-parity — roster defined in verify/SKILL.md)
     → if all green: opens MR and transitions Jira to "In Review"
     → if fixable issues: auto-routes back to implement under per-category retry caps (1–5)
       and the verify-loop ceiling (default 3)
     → if escalates: pauses, you decide

5. Teammate reviews MR and merges
```

**The dev's keystrokes for a clean ticket: two `/work` calls.** Anything else is a real gate (plan review, verifier escalation, iteration ceiling).

If the driver pauses, the message tells you exactly why and what to do next. State lives in `.claude/state/<ticket>.json` and survives session restarts.

---

## Edge cases — running skills directly

Sometimes you need to do something off-flow. These are standalone:

| Skill | Use |
|---|---|
| `/brainstorm <topic>` | Spitball alternatives before any ticket exists |
| `/debug <symptom>` | Systematic root-cause for a bug |
| `/explore <question>` | Read-only codebase exploration (no edits) |
| `/lint-ticket PROJ-XYZ` | Check DoR on a ticket without starting it |

These don't touch state. They're for when you need the AI to think, not to drive the workflow.

You can also call phase-specific skills (`/plan`, `/verify`, etc.) directly. They detect if there's an active state for the current branch and either advance it or ask if you really want to run standalone.

---

## Troubleshooting

### Claude Code warns: "Missing environment variables: INTERNAL_JIRA_MCP_PATH, JIRA_BASE_URL, JIRA_PAT"

direnv didn't load `.envrc` into the shell that launched Claude Code.

```bash
direnv status                # should say ".envrc loaded" — if not:
cd /Users/dev/Documents/projects/monorepo-main
direnv allow
echo $JIRA_PAT               # should print your token
```

Then **fully restart Claude Code from this shell** (close the IDE, re-launch with `code .` or `cursor .` from terminal). IDEs launched from Finder/Spotlight don't inherit terminal env.

If `direnv` itself isn't loading on shell startup, your shell rc is missing the hook:

```bash
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc   # or .bashrc
exec zsh
```

### `/work` says "no active ticket"

You're not on a `feat/PROJ-*` branch. Run `/work PROJ-XYZ` to start one.

### `/mcp` shows internal-jira failed

- Check the path in `.claude/.env` (`INTERNAL_JIRA_MCP_PATH`) exists
- Check `${INTERNAL_JIRA_MCP_PATH}/dist/server.js` exists (rebuild if not: `cd <path> && pnpm build`)
- Verify env vars are in your shell (see above)

### `/mcp` shows figma failed

- The remote MCP at `mcp.figma.com` requires OAuth. Run `/mcp` and click the auth link — it opens figma.com in your browser. Log in, approve, return to Claude Code.
- No token to put in `.env` for Figma. It's all OAuth-managed by Claude Code.
- If OAuth was completed but it still fails, the token may have expired — run `/mcp` again to re-auth.

### Cursor: session start says superpowers is missing

Run `/add-plugin superpowers` in Agent chat (one-time per machine). Cursor has no repo-declared plugin auto-install, so a fresh machine always needs this once. The nudge disappears next session.

### Cursor: internal-jira has no env vars / server won't start

Same direnv root cause as the Claude Code entry above — relaunch with `cursor .` from a shell where `echo $JIRA_PAT` works. Note `.cursor/mcp.json` also loads `.claude/.env` via `envFile` for the server process, but the server *path* in `args` (`${env:INTERNAL_JIRA_MCP_PATH}`) resolves from the env of the Cursor process itself, so the shell launch matters.

### The workflow lost my place

Check `.claude/state/<ticket>.json` — open it, the `phase` field shows where the driver thinks you are. Edit manually if needed (e.g., set `phase: "plan-review"` to force re-review).

### Plan agent generated a bad plan

Tell `/work` "regenerate plan with these constraints: …" — it overwrites `plan.md` (and saves the previous version as `plan.v1.md`).

### Verifier loop won't pass

After the per-category retry cap (1–5 depending on failure type) or the verify-loop ceiling (default 3) it escalates to human. Read `.agentic/plans/<ticket>/verify/coordinator.json` for the verifier details. Often the spec is wrong, not the code — bounce the ticket back to the BA via Jira and break the loop.

### Need to bypass

You can `git push --no-verify`, etc. The workflow doesn't lock you out. But the pre-commit hook will warn if state is incomplete. Use sparingly; it loses traceability.

A note on what the hooks are: **guardrails against a confused agent, not a security boundary.** Every hook rule is a regex over the proposed command — good at catching the honest mistake, evadable by a determined one. The things that must actually be impossible (IaC mutation, unreviewed merges) are enforced where enforcement is real: human review, protected branches, CI permissions.

---

## Further reading

- [.agentic/AGENTS.md](../.agentic/AGENTS.md) — repo-wide architecture context
- [.agentic/rules/](../.agentic/rules/) — all coding rules per package
- [GITFLOW.md](../GITFLOW.md) — branching, releases, deploy triggers
- [SETUP.md](../SETUP.md) — local dev setup (apps, docker, AWS CLI)
