#!/usr/bin/env bash
# PostToolUse hook (matcher: Bash).
#
# Runs after every Bash tool call. Currently:
#   - If the command was a successful `git commit`, append the commit SHA to
#     the active ticket's state.history for traceability.
#   - Silently exits otherwise (we don't want to slow down every shell call).

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$REPO_ROOT/.claude/state"

# Dual-harness input: Claude Code PostToolUse (.tool_input.command /
# .tool_response.exit_code) or Cursor afterShellExecution (.command; exit code
# field tolerated in several spellings — empty is treated as success below).
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || echo "")
exit_code=$(echo "$input" | jq -r '.tool_response.exit_code // .exit_code // .exitCode // empty' 2>/dev/null || echo "")

# Only act on successful git commit
if [[ ! "$command" =~ git[[:space:]]+commit ]]; then
  exit 0
fi
if [[ "$exit_code" != "0" && -n "$exit_code" ]]; then
  exit 0
fi

# ─── find active state for this branch ─────────────────────────────────────

branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
[[ -z "$branch" ]] && exit 0

state_file=""
if [[ -d "$STATE_DIR" ]]; then
  for f in "$STATE_DIR"/*.json; do
    [[ -e "$f" ]] || continue
    state_branch=$(jq -r '.branch // empty' "$f" 2>/dev/null || echo "")
    if [[ "$state_branch" == "$branch" ]]; then
      state_file="$f"
      break
    fi
  done
fi
[[ -z "$state_file" ]] && exit 0

# ─── append commit SHA to history ──────────────────────────────────────────
# Goes through state-update.mjs (locked + atomic) — the driver mutates state
# through the same path, so concurrent writes can't clobber each other.

sha=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "")
[[ -z "$sha" ]] && exit 0

message=$(git -C "$REPO_ROOT" log -1 --pretty=%s 2>/dev/null || echo "")

if command -v node >/dev/null 2>&1; then
  node "$REPO_ROOT/.claude/scripts/state-update.mjs" "$state_file" \
    append-history --summary "commit ${sha}: ${message}" >/dev/null 2>&1 || true
fi
# node unavailable → skip the append (a traceability gap, never a corrupt write)

exit 0
