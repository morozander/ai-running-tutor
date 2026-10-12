#!/usr/bin/env bash
# Pre-commit hook.
#
# Runs as a git pre-commit hook (install via lefthook.yml — see snippet below).
# Checks:
#   1. No staged secrets (basic regex scan) — the only BLOCKING check
#   2. State file is well-formed if exists for current branch (blocks on invalid JSON)
#   3. Phase consistency — WARNS (does not block) when committing in 'review-ready'/'done',
#      since that invalidates the verify verdict and a new /verify cycle will be needed.
#      Commits during 'verifying' are expected (/implement fix-mode) and allowed silently.
#
# These are guardrails against a confused agent, not a security boundary — a determined
# command can bypass a regex or hook (--no-verify). The enforced path is code review + CI.
#
# Install instructions are in lefthook.yml. Add this entry under `pre-commit:` commands.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE_DIR="$REPO_ROOT/.claude/state"

GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
RESET=$'\033[0m'

ok()    { echo "  ${GREEN}✓${RESET} $*"; }
warn()  { echo "  ${YELLOW}!${RESET} $*"; }
fail()  { echo "  ${RED}✗${RESET} $*" >&2; }

# ─── 1. Secret scan ────────────────────────────────────────────────────────

scan_secrets() {
  local staged
  staged=$(git diff --cached --name-only --diff-filter=ACMR)
  [[ -z "$staged" ]] && return 0

  local patterns='(AKIA[0-9A-Z]{16}|aws_secret_access_key\s*=\s*[A-Za-z0-9/+]{30,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})'

  local hits=0
  while IFS= read -r file; do
    [[ -e "$file" ]] || continue
    # .example files are templates (placeholder values) — skip. Real .env files are
    # NOT exempt: they're gitignored, so one showing up staged is exactly the case
    # the scan exists for.
    [[ "$file" =~ \.example$ ]] && continue
    if grep -E -n "$patterns" "$file" 2>/dev/null; then
      fail "Likely secret in $file"
      hits=$((hits + 1))
    fi
  done <<< "$staged"

  if (( hits > 0 )); then
    fail "Pre-commit blocked: $hits secret pattern match(es)."
    return 1
  fi
  ok "No secrets detected in staged files"
}

# ─── 2. State file consistency ─────────────────────────────────────────────

check_state() {
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  [[ -z "$branch" ]] && return 0

  # Find state file for this branch
  if [[ ! -d "$STATE_DIR" ]]; then
    return 0
  fi

  for f in "$STATE_DIR"/*.json; do
    [[ -e "$f" ]] || continue
    if ! jq empty "$f" 2>/dev/null; then
      fail "State file is not valid JSON: $f"
      return 1
    fi

    local state_branch
    state_branch=$(jq -r '.branch // empty' "$f" 2>/dev/null || echo "")
    if [[ "$state_branch" == "$branch" ]]; then
      local phase
      phase=$(jq -r '.phase' "$f")

      # Rule: phase == 'verifying' means /verify is mid-flight; commits during this phase
      # are usually from /implement --fix-mode, which is OK. But naked commits aren't.
      # If --no-verify flag is set, skip the check.
      if [[ "$phase" == "review-ready" || "$phase" == "done" ]]; then
        warn "Phase is '$phase' — committing now will require a new /verify cycle"
      fi
      ok "State file valid for active ticket"
    fi
  done
}

# ─── 3. Branch convention check (informational) ────────────────────────────

check_branch() {
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  case "$branch" in
    main|master|develop|HEAD|"") return 0 ;;
    feat/*|fix/*|refactor/*|chore/*|docs/*|test/*|style/*|ci/*|perf/*|build/*|release/*)
      ok "Branch name follows convention"
      ;;
    *)
      warn "Branch '$branch' doesn't follow <type>/<JIRA-KEY>-<name> convention (see .agentic/rules/_shared/branch-conventions.md)"
      ;;
  esac
}

# ─── main ──────────────────────────────────────────────────────────────────

echo "[pre-commit] Running workflow checks…"
scan_secrets
check_state
check_branch
echo "[pre-commit] ✓ All checks passed"
