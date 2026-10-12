# `.cursor/` — Cursor harness config

This repo's workflow is authored once and consumed by both Claude Code and Cursor.
Cursor natively compat-loads the shared surfaces, so only genuinely divergent
config lives here. Verified against cursor.com/docs on 2026-07-08 (Cursor 3.x).

## What Cursor loads from where

| Surface | Source | How Cursor gets it |
|---|---|---|
| Skills (`/work`, `/start`, `/plan`, …) | `.claude/skills/` | native compat path — loaded as-is, do NOT copy here |
| Slash commands (engineering skills) | `.claude/commands/` | Claude Code + Cursor compat — authored here; no `.agents/` link step |
| Subagents | `.claude/agents/` (source) | **generated** → [agents/](./agents/) by `.agentic/scripts/sync.ts` (model aliases → Cursor slugs; `.cursor/agents` wins name conflicts) |
| Rules | `.agentic/rules/**` | **generated** → [rules/](./rules/) by the same sync script |
| Repo context | `.agentic/AGENTS.md` | root `AGENTS.md` symlink (read natively) |
| Hook scripts | `.claude/hooks/*.sh` (dual-format) | wired via [hooks.json](./hooks.json) — same scripts as Claude Code; they emit/accept both harnesses' JSON envelopes and both harnesses set `CLAUDE_PROJECT_DIR` |
| MCP servers | authored here | [mcp.json](./mcp.json) (hand-maintained twin of root `.mcp.json` — update BOTH when servers change) |
| Headless-CLI permissions | authored here | [cli.json](./cli.json) — allow-list mirrors `.claude/settings.json`; deny-list enforces the IaC-apply ban because **hooks do not run in the headless CLI** |
| Plugin enablement | written by Cursor | [settings.json](./settings.json) — created by `/add-plugin superpowers` (project scope); committed so the enablement intent travels with the repo. Plugin content caches per-machine under `~/.cursor/plugins/cache/` |

## Regenerating

```bash
cd .agentic/scripts && pnpm sync    # rules + agents; `pnpm sync:check` in CI
```

Never edit `rules/*.mdc` or `agents/*.md` here — edit the sources and re-sync.

## Models

Subagents default to the **Claude family**, mirroring the Claude Code tiers:
`opus → claude-opus-4-8`, `sonnet → claude-sonnet-5`, `haiku → claude-4.5-haiku`.
To run the flow on a different family (e.g. `gpt-5.5`, `composer-2.5`), edit
`CURSOR_MODEL_MAP` in `.agentic/scripts/sync.ts` and re-run `pnpm sync` — that is
the single experiment knob; don't edit the generated `agents/*.md` model lines.
The main agent session uses whatever you select in Cursor's model picker.

## One-time setup in Cursor

1. Launch from a direnv-loaded shell (`cursor .`) so `JIRA_PAT` / `INTERNAL_JIRA_MCP_PATH` are inherited — same rule as Claude Code (see `.claude/ONBOARDING.md`, which has a full "In Cursor" section).
2. MCP servers from [mcp.json](./mcp.json) are picked up on open (Cursor currently enables project servers by default; every tool *call* still asks for approval). figma triggers OAuth on first use.
3. Skills library: the committed [settings.json](./settings.json) already enables the `superpowers` plugin at project scope (verified marketplace listing — same skills the flow's `/brainstorm`, `/debug`, and TDD enforcement delegate to). Plugin content caches per-machine — if the skills don't appear on a fresh machine, run `/add-plugin superpowers` once; the session-start hook nudges when the plugin isn't actually present.
4. `typescript-lsp` / `playwright` / `security-guidance` Claude plugins have no Cursor install and none is needed: Cursor has native code intelligence and a built-in Browser tool; the runtime-smoke verifier's Playwright-CLI fallback works unchanged; the flow's own security verifiers cover in-flow review.

## Duplication notes

- Rules exist twice ON DISK by design (`.agentic` source → generated `.mdc` here) but never twice IN CONTEXT: Cursor attaches `.mdc` by glob/alwaysApply and ignores the `.agentic` sources; Claude Code reads `CLAUDE.md` links and never sees `.cursor/rules`.
- Root `AGENTS.md` + `CLAUDE.md` are symlinks to one file. The Cursor IDE reads only `AGENTS.md` (single load). The headless `agent` CLI reads both at the root — a harmless duplicate of the same ~7 KB in that surface only.
