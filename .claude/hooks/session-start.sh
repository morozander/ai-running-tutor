#!/usr/bin/env bash
# SessionStart hook.
#
# Runs on every session start / clear / compact. Detects whether there's an active
# ticket state on the current branch and injects either:
#   - "[workflow] active ticket: PROJ-123 (phase: implementing). Use /work to advance."
#   - "[workflow] no active ticket on this branch. Use /work PROJ-XXX to start."
#
# Also injects the `using-workflow` meta-skill content so the agent enforces the
# driver pattern from the very first message.
#
# Output protocol: emit JSON to stdout with hookSpecificOutput.additionalContext.
# Errors / debug info go to stderr (Claude Code captures them for diagnostics).

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$REPO_ROOT/.claude/state"
META_SKILL="$REPO_ROOT/.claude/skills/using-workflow/SKILL.md"

# ─── helpers ───────────────────────────────────────────────────────────────

current_branch() {
  git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

find_state_for_branch() {
  local branch="$1"
  if [[ ! -d "$STATE_DIR" ]]; then
    return 1
  fi
  for f in "$STATE_DIR"/*.json; do
    [[ -e "$f" ]] || continue
    local state_branch
    state_branch=$(jq -r '.branch // empty' "$f" 2>/dev/null || echo "")
    if [[ "$state_branch" == "$branch" ]]; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

# ─── context message ───────────────────────────────────────────────────────

branch=$(current_branch)
state_file=""
if state_file=$(find_state_for_branch "$branch"); then
  ticket=$(jq -r '.ticket' "$state_file")
  phase=$(jq -r '.phase' "$state_file")
  context_msg="[workflow] Active ticket: ${ticket} (branch: ${branch}, phase: ${phase}).
Use /work to advance the workflow. Do not call sub-skills (/plan, /implement, /verify, /handoff) directly unless explicitly asked for standalone use."
else
  context_msg="[workflow] No active ticket on branch '${branch}'.
- For ticket work: /work PROJ-XXX to start a new ticket
- For off-flow work: /brainstorm, /debug, /explore (read-only), /lint-ticket
- See .claude/ONBOARDING.md for the full workflow"
fi

# ─── Cursor-only: nudge if the superpowers plugin is missing ───────────────
# Claude Code auto-prompts plugin installs from settings.json enabledPlugins;
# Cursor has NO repo-declared plugin install, so we detect and nudge instead.
# CURSOR_VERSION is set for every Cursor hook run (and never by Claude Code).
# Detection paths are best-effort (marketplace cache + local-dev dir) — this
# only ever ADDS an informational line, never blocks.

if [[ -n "${CURSOR_VERSION:-}" ]]; then
  if ! ls "$HOME"/.cursor/plugins/cache/*/superpowers/*/ >/dev/null 2>&1 \
     && [[ ! -e "$HOME/.cursor/plugins/local/superpowers" ]]; then
    context_msg+=$'\n\n'"[setup] The 'superpowers' plugin is not installed in this Cursor. /brainstorm, /debug and the TDD enforcement in /implement delegate to its skills — tell the dev to run: /add-plugin superpowers (one-time per machine; see .cursor/README.md)."
  fi
fi

# ─── inject meta-skill if available ────────────────────────────────────────

meta_skill_content=""
if [[ -f "$META_SKILL" ]]; then
  meta_skill_content=$(cat "$META_SKILL")
fi

# ─── emit JSON for Claude Code AND Cursor ──────────────────────────────────

# One payload serves both harnesses (each ignores the other's keys):
#   Claude Code reads: .hookSpecificOutput.additionalContext
#   Cursor reads:      .additional_context  (sessionStart hook, cursor.com/docs/hooks)
# Both provide CLAUDE_PROJECT_DIR to this script (Cursor ships it as a compat alias).

additional_context=$(cat <<EOF
$context_msg

---

$meta_skill_content
EOF
)

jq -n \
  --arg ctx "$additional_context" \
  '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $ctx
    },
    additional_context: $ctx
  }'
