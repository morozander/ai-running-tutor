#!/usr/bin/env bash
# SessionStart hook: leave-no-trace backstop.
#
# Reads every runtime ledger (.agentic/plans/*/verify/runtime-ledger.json — see
# .agentic/rules/_shared/leave-no-trace.md) and surfaces entries whose PID or
# docker container is STILL ALIVE: "leftovers from a previous run" with their
# recorded teardown one-liners. Informational only — it never kills anything.
#
# Fail-silent by design: any error, missing tool, or empty/absent ledger exits 0
# with no output so the session is never blocked.

set -uo pipefail
trap 'exit 0' ERR

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
command -v jq >/dev/null 2>&1 || exit 0

running_containers=""
if command -v docker >/dev/null 2>&1; then
  running_containers=$(docker ps --format '{{.Names}}' 2>/dev/null || true)
fi

lines=""
for ledger in "$REPO_ROOT"/.agentic/plans/*/verify/runtime-ledger.json; do
  [[ -f "$ledger" ]] || continue
  while IFS= read -r entry; do
    [[ -n "$entry" ]] || continue
    pid=$(jq -r '.pid // empty' <<<"$entry" 2>/dev/null || true)
    container=$(jq -r '.container // empty' <<<"$entry" 2>/dev/null || true)
    what=$(jq -r '.what // "unknown"' <<<"$entry" 2>/dev/null || echo "unknown")
    teardown=$(jq -r '.teardown // "unknown"' <<<"$entry" 2>/dev/null || echo "unknown")
    cmd=$(jq -r '.cmd // empty' <<<"$entry" 2>/dev/null || true)
    alive=""
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      # Guard against PID recycling: when the ledger recorded the command, the live
      # process must still look like it (first token match) before we claim it.
      if [[ -n "$cmd" ]]; then
        live_cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
        tok=$(awk '{print $1}' <<<"$cmd")
        [[ -n "$live_cmd" && "$live_cmd" == *"$tok"* ]] && alive="pid $pid"
      else
        alive="pid $pid"
      fi
    fi
    if [[ -n "$container" && -n "$running_containers" ]] && grep -qxF "$container" <<<"$running_containers"; then
      alive="${alive:+$alive, }container $container"
    fi
    [[ -n "$alive" ]] && lines+="  • ${what} (${alive}) — teardown: ${teardown}"$'\n'
  done < <(jq -c 'if type == "array" then .[] else empty end' "$ledger" 2>/dev/null || true)
done

[[ -n "$lines" ]] || exit 0

notice="[leave-no-trace] Leftovers from a previous run are still alive (from .agentic/plans/*/verify/runtime-ledger.json):
${lines}Reuse them if continuing that ticket; otherwise run the teardown commands. Nothing is killed automatically."

# Dual-format payload: Claude Code reads .hookSpecificOutput.additionalContext,
# Cursor's sessionStart hook reads .additional_context. Each ignores the other.
jq -n --arg ctx "$notice" '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $ctx }, additional_context: $ctx }'
exit 0
