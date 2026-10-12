#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash).
#
# Reads the proposed Bash command from stdin (Claude Code JSON envelope) and
# decides whether to allow, warn, or block it based on workflow state.
#
# Blocks (deny payload):
#   - IaC mutation (terraform/terragrunt/tofu apply|destroy|import|state rm, cdk deploy|destroy,
#     pulumi up|destroy|import|refresh) — always
#   - MR/PR creation (gh pr create / glab mr create, git push -o merge_request.create,
#     gh/glab api mutations on pulls/merge_requests, curl POSTs to those endpoints)
#     when phase != review-ready/done
#   - recursive rm aimed at the workspace root / home / filesystem root
# Warns (stderr, allows):
#   - git push --no-verify
#
# These are GUARDRAILS against a confused agent, not a security boundary — every
# rule is a regex, and a determined command can evade a regex (the docs must not
# claim otherwise). The enforced path for infra changes and MRs is human review + CI.
#
# Allows everything else (exit 0).

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$REPO_ROOT/.claude/state"

# Dual-harness input: Claude Code PreToolUse puts the shell command at
# .tool_input.command; Cursor's beforeShellExecution puts it at .command.
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || echo "")

if [[ -z "$command" ]]; then
  # Not a shell tool call or malformed input — allow silently
  exit 0
fi

# ─── helpers ───────────────────────────────────────────────────────────────

current_branch() {
  git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

state_phase_for_branch() {
  local branch="$1"
  if [[ ! -d "$STATE_DIR" ]]; then
    echo "none"
    return
  fi
  for f in "$STATE_DIR"/*.json; do
    [[ -e "$f" ]] || continue
    local state_branch
    state_branch=$(jq -r '.branch // empty' "$f" 2>/dev/null || echo "")
    if [[ "$state_branch" == "$branch" ]]; then
      jq -r '.phase' "$f"
      return
    fi
  done
  echo "none"
}

block_with_reason() {
  local reason="$1"
  # Dual-harness deny payload in one object — each harness ignores the other's keys:
  #   Claude Code reads .hookSpecificOutput.permissionDecision/-Reason
  #   Cursor (beforeShellExecution) reads .permission / .agent_message / .user_message
  jq -n --arg r "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    },
    permission: "deny",
    agent_message: $r,
    user_message: $r
  }'
  exit 0  # exit 0 with a deny payload blocks in both harnesses
}

# ─── rules ─────────────────────────────────────────────────────────────────

branch=$(current_branch)
phase=$(state_phase_for_branch "$branch")

# Command-position prefix: the tool name must START a command — after ^, a
# separator (; & |), a substitution ($( or `), a `-c "…"` shell wrapper
# (bash/sh/zsh -c), or a `-- ` passthrough (mise exec -- …). Mid-prose mentions
# (git commit -m 'docs: …', echo, grep patterns) no longer false-positive.
re_pos='(^|[;&|]|\$\(|`|-c[[:space:]]+["'"'"']|--[[:space:]])[[:space:]]*'

# Rule 0: refuse IaC mutation from the workflow (guardrail, not a wall — see header).
# Infrastructure changes are human-only deployment steps surfaced in /open-mr's
# Deployment Prerequisites. `validate` and `plan` are allowed; `apply`, `destroy`,
# `import`, `state rm` (and the cdk/pulumi equivalents) are not.
# The trailing [^[:alnum:]_-] anchor means `apply;`, `apply&&`, `apply"` etc. still match;
# the ([[:space:]]+[^|;&]*)? middle tolerates global flags (`cdk --profile prod deploy`).
re_iac="${re_pos}"'(terragrunt|terraform|tofu)([[:space:]]+[^|;&]*)?[[:space:]]+(apply|destroy|import)([^[:alnum:]_-]|$)'
re_iac_staterm="${re_pos}"'(terragrunt|terraform|tofu)([[:space:]]+[^|;&]*)?[[:space:]]+state[[:space:]]+rm'
re_iac_cdkpulumi="${re_pos}"'(cdk|pulumi)([[:space:]]+[^|;&]*)?[[:space:]]+(deploy|destroy|up|import|refresh)([^[:alnum:]_-]|$)'
if [[ "$command" =~ $re_iac ]] || [[ "$command" =~ $re_iac_staterm ]] || [[ "$command" =~ $re_iac_cdkpulumi ]]; then
  block_with_reason "Refusing IaC mutation (apply/destroy/import/state rm — terraform/terragrunt/tofu/cdk/pulumi). The spec-driven workflow does not mutate infrastructure — these are human deployment steps listed in /open-mr's Deployment Prerequisites. Only 'validate' and 'plan' are permitted. (This hook is a guardrail, not a security boundary.)"
fi

# Rule 1: block MR/PR creation outside review-ready phase — the CLI form (global
# flags tolerated), GitLab push-options (git -c … push too), and gh/glab/curl API
# mutations against the MR/PR COLLECTION endpoints (sub-resources like /notes or
# /comments — commenting on an existing MR — are not creation and stay allowed).
re_mr_cli='(gh|glab)([[:space:]]+[^|;&]*)?[[:space:]]+(pr|mr)[[:space:]]+create'
re_mr_pushopt='git([[:space:]]+[^|;&]*)?[[:space:]]+push[[:space:]][^|;&]*(-o[[:space:]]*|--push-option(=|[[:space:]]+))merge_request\.create'
re_mr_api='(gh|glab)[[:space:]]+api[[:space:]]'
re_api_mutation='(-f[[:space:]]|-F[[:space:]]|--field|--raw-field|--input|--method[[:space:]]+(POST|PUT)|-X[[:space:]]*(POST|PUT))'
re_curl='(^|[;&|[:space:]])curl[[:space:]]'
re_curl_mutation='(-X[[:space:]]*(POST|PUT)|--request[[:space:]]+(POST|PUT)|--data|-d[^[:alpha:]]|--form|-F[[:space:]]|--json)'
# collection endpoint = pulls/merge_requests NOT followed by a sub-resource path
re_mr_collection='(pulls|merge_requests)(\?[^/[:space:]]*)?([[:space:]"'"'"'&;|]|$)'
# GraphQL creation mutations have no path shape — match the mutation names
re_mr_graphql='(createPullRequest|createMergeRequest|mergeRequestCreate)'
if [[ "$command" =~ $re_mr_cli ]] \
   || [[ "$command" =~ $re_mr_pushopt ]] \
   || { [[ "$command" =~ $re_mr_api ]] && [[ "$command" =~ $re_api_mutation ]] && { [[ "$command" =~ $re_mr_collection ]] || [[ "$command" =~ $re_mr_graphql ]]; }; } \
   || { [[ "$command" =~ $re_curl ]] && [[ "$command" =~ $re_curl_mutation ]] && { [[ "$command" =~ $re_mr_collection ]] || [[ "$command" =~ $re_mr_graphql ]]; }; }; then
  if [[ "$phase" != "review-ready" && "$phase" != "done" ]]; then
    block_with_reason "Cannot open MR/PR — workflow phase is '$phase', expected 'review-ready'. Use /work to advance through /verify first, or use /open-mr --skip-verify if you really mean to skip verification (not recommended)."
  fi
fi

# Rule 2: warn (not block) on --no-verify pushes
if [[ "$command" =~ git[[:space:]]+push.*--no-verify ]]; then
  echo "⚠ git push --no-verify bypasses pre-commit gates. Proceeding." >&2
fi

# Rule 3: block recursive rm aimed at the workspace root / home / fs root (defensive).
# Flag-order agnostic (-rf, -fr, -r, -R, --recursive); target may be quoted,
# globbed (/*, ./*), or spelled $HOME/${HOME}/$PWD/${PWD}.
re_rm_cmd='(^|[;&|[:space:]])rm[[:space:]]'
re_rm_recursive='[[:space:]](-[[:alnum:]]*[rR][[:alnum:]]*|--recursive)([[:space:]]|$)'
re_rm_target='[[:space:]]["'"'"']?(\.|\./|\.\./|/|~|~/|\$\{?(HOME|PWD)\}?/?)\*?["'"'"']?([[:space:]]|$|[;&|])'
if [[ "$command" =~ $re_rm_cmd ]] && [[ "$command" =~ $re_rm_recursive ]] && [[ "$command" =~ $re_rm_target ]]; then
  block_with_reason "Refusing recursive rm aimed at the workspace root / home / filesystem root. If this is intentional, run it from a terminal directly."
fi

# Default — allow
exit 0
