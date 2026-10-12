#!/usr/bin/env bash
# setup-claude.sh — One-shot onboarding for the spec-driven workflow.
#
# What it does:
#   1. Verifies prerequisites (node, pnpm, claude CLI)
#   2. Optionally clones + builds internal-jira-mcp
#   3. Configures Jira PAT (saved to OS keychain via `security` on macOS)
#   4. Prompts to authenticate Figma MCP
#   5. Writes a .claude/.env file with paths used by .mcp.json
#   6. Prints next-steps for the dev to do inside Claude Code
#
# Idempotent — re-run any time. Steps that are already done are skipped.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly CLAUDE_DIR="$REPO_ROOT/.claude"
readonly ENV_FILE="$CLAUDE_DIR/.env"
readonly DEFAULT_MCP_DIR="$HOME/code/internal-jira-mcp"

# ─── pretty output ─────────────────────────────────────────────────────────

GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

step()    { echo "${BOLD}==> $*${RESET}"; }
ok()      { echo "  ${GREEN}✓${RESET} $*"; }
warn()    { echo "  ${YELLOW}!${RESET} $*"; }
fail()    { echo "  ${RED}✗${RESET} $*" >&2; }
ask()     { local prompt="$1" default="${2:-}" reply; read -rp "  ${BOLD}?${RESET} $prompt${default:+ [$default]}: " reply; echo "${reply:-$default}"; }
confirm() { local prompt="$1" reply; read -rp "  ${BOLD}?${RESET} $prompt [Y/n]: " reply; reply="${reply:-Y}"; [[ "$reply" =~ ^[Yy]$ ]]; }

# ─── prereqs ───────────────────────────────────────────────────────────────

check_prereqs() {
  step "Checking prerequisites"

  local missing=0

  if ! command -v node >/dev/null 2>&1; then
    fail "node not found. Install Node 20+ via mise: mise install node@22"
    missing=1
  else
    local v; v=$(node --version)
    ok "node $v"
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    fail "pnpm not found. Install via mise: mise install pnpm@9"
    missing=1
  else
    local v; v=$(pnpm --version)
    ok "pnpm $v"
  fi

  if ! command -v claude >/dev/null 2>&1; then
    warn "claude CLI not found. The workflow runs in Claude Code (IDE extension or desktop). CLI is optional but helpful for /plugin and /mcp commands."
  else
    ok "claude CLI present"
  fi

  if ! command -v jq >/dev/null 2>&1; then
    warn "jq not found — required by the workflow's hooks. 'mise install' provides it (declared in mise.toml)."
  else
    ok "jq present"
  fi

  if ! command -v direnv >/dev/null 2>&1; then
    warn "direnv not found — loads .claude/.env into your shell. 'mise install' provides it; you still add the shell hook (see next steps)."
  else
    ok "direnv present"
  fi

  if (( missing )); then
    fail "Install the missing tools and re-run."
    exit 1
  fi
}

# ─── toolchain (mise) ────────────────────────────────────────────────────────

activate_toolchain() {
  step "Pinned toolchain (mise)"

  if ! command -v mise >/dev/null 2>&1; then
    warn "mise not found. Install it (https://mise.run) and re-run — it pins Node 22.22.0 + pnpm 9.15.0 and provides jq/direnv/typescript-language-server."
    return
  fi

  mise trust >/dev/null 2>&1 || true
  if mise install; then
    ok "Toolchain installed (node, pnpm, jq, direnv, typescript-language-server)"
  else
    warn "mise install reported issues — review the output above."
  fi

  # corepack activates the pinned pnpm so a stray pnpm on PATH can't be used by mistake
  corepack enable >/dev/null 2>&1 || true

  local nv pv
  nv=$(mise exec -- node --version 2>/dev/null || echo '?')
  pv=$(mise exec -- pnpm --version 2>/dev/null || echo '?')
  ok "node $nv / pnpm $pv (expected v22.22.x / 9.15.x)"
  if [[ "$nv" != v22.22.* || "$pv" != 9.15.* ]]; then
    warn "Your shell may not be using mise. Add the activation hook: eval \"\$(mise activate zsh)\"  (or bash)"
  fi
}

# ─── env file ──────────────────────────────────────────────────────────────

load_env() {
  mkdir -p "$CLAUDE_DIR"
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a; source "$ENV_FILE"; set +a
  fi
}

set_env() {
  local key="$1" value="$2"
  local tmp
  tmp=$(mktemp)
  if [[ -f "$ENV_FILE" ]]; then
    grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  export "$key=$value"
}

# ─── internal-jira-mcp ─────────────────────────────────────────────────────

setup_internal_jira_mcp() {
  step "internal-jira-mcp (Jira data source)"

  local mcp_path="${INTERNAL_JIRA_MCP_PATH:-}"

  if [[ -z "$mcp_path" ]]; then
    mcp_path=$(ask "Path to internal-jira-mcp repo" "$DEFAULT_MCP_DIR")
  fi

  if [[ ! -d "$mcp_path" ]]; then
    warn "Not found at $mcp_path"
    if confirm "Clone it now?"; then
      local remote
      remote=$(ask "Git remote URL" "git@gitlab.geniusee.com:y.demkovych/internal-jira-mcp.git")
      mkdir -p "$(dirname "$mcp_path")"
      git clone "$remote" "$mcp_path"
    else
      warn "Skipping. The workflow's /start skill will fail until internal-jira-mcp is available."
      return
    fi
  fi

  if [[ ! -f "$mcp_path/dist/server.js" ]]; then
    step "Building internal-jira-mcp"
    (cd "$mcp_path" && pnpm install && pnpm run build)
  fi

  ok "internal-jira-mcp built at $mcp_path"
  set_env "INTERNAL_JIRA_MCP_PATH" "$mcp_path"
}

# ─── Jira auth ─────────────────────────────────────────────────────────────

setup_jira_auth() {
  step "Jira authentication"

  local type="${JIRA_TYPE:-}"
  if [[ -z "$type" ]]; then
    type=$(ask "Jira deployment type (server|cloud)" "server")
  fi
  set_env "JIRA_TYPE" "$type"

  case "$type" in
    server)
      local base="${JIRA_BASE_URL:-}"
      if [[ -z "$base" ]]; then
        base=$(ask "Jira base URL" "https://tracker.geniusee.tk")
      fi
      set_env "JIRA_BASE_URL" "$base"

      if [[ -z "${JIRA_PAT:-}" ]]; then
        warn "Personal Access Token required."
        warn "Create one at: $base/secure/ViewProfile.jspa → Personal Access Tokens"
        warn "Recommended: 365-day expiry, name 'mcp-local'."
        local pat
        pat=$(ask "Paste your PAT (input hidden won't echo, but we store in $ENV_FILE 600)" "")
        if [[ -n "$pat" ]]; then
          set_env "JIRA_PAT" "$pat"
          ok "PAT saved to $ENV_FILE"
        else
          warn "Skipped. /start skill won't work without it."
        fi
      else
        ok "JIRA_PAT already configured"
      fi
      ;;
    cloud)
      local base="${JIRA_BASE_URL:-}"
      if [[ -z "$base" ]]; then
        base=$(ask "Jira Cloud base URL" "https://yourcompany.atlassian.net")
      fi
      set_env "JIRA_BASE_URL" "$base"

      if [[ -z "${JIRA_EMAIL:-}" ]]; then
        set_env "JIRA_EMAIL" "$(ask 'Your Atlassian account email' "")"
      fi
      if [[ -z "${JIRA_API_TOKEN:-}" ]]; then
        warn "API token required: https://id.atlassian.com/manage-profile/security/api-tokens"
        set_env "JIRA_API_TOKEN" "$(ask 'Paste API token' '')"
      else
        ok "JIRA_API_TOKEN already configured"
      fi
      ;;
    *)
      fail "Unknown JIRA_TYPE: $type"
      ;;
  esac
}

# ─── Figma ─────────────────────────────────────────────────────────────────

setup_figma_auth() {
  step "Figma Remote MCP"

  ok "Figma remote MCP requires no token here — auth happens via OAuth in Claude Code on first use."
  ok "When you run /mcp in Claude Code, it will prompt you to log in to Figma in your browser."
  ok "No Dev Mode seat or paid plan required — works on all Figma plans."
}

# ─── apps .env ─────────────────────────────────────────────────────────────

setup_app_env_files() {
  step "Per-app .env files"

  for app in backend frontend mobile/expo-boilerplate; do
    local example="$REPO_ROOT/$app/.env.example"
    local target="$REPO_ROOT/$app/.env"

    if [[ ! -f "$example" ]]; then continue; fi
    if [[ -f "$target" ]]; then
      ok "$app/.env exists (skipped)"
      continue
    fi
    cp "$example" "$target"
    ok "Created $app/.env from .env.example (fill in values from password manager)"
  done
}

# ─── .agentic/scripts deps ──────────────────────────────────────────────────

setup_agentic_scripts() {
  step "Installing .agentic/scripts deps (for sync.ts)"

  if [[ ! -d "$REPO_ROOT/.agentic/scripts/node_modules" ]]; then
    (cd "$REPO_ROOT/.agentic/scripts" && pnpm install)
  fi
  ok "sync.ts ready (run from .agentic/scripts: pnpm sync)"
}

# ─── direnv ──────────────────────────────────────────────────────────────────

allow_direnv() {
  step "Allowing direnv (.envrc → .claude/.env)"
  if ! command -v direnv >/dev/null 2>&1; then
    warn "direnv missing — skipping. Install via mise/brew, add the shell hook, then run 'direnv allow' here."
    return
  fi
  if (cd "$REPO_ROOT" && direnv allow) 2>/dev/null; then
    ok "direnv allowed — new shells opened in this repo auto-load .claude/.env."
    warn "If 'echo \$JIRA_PAT' is empty in your CURRENT shell, the direnv shell hook isn't installed yet — see next steps."
  else
    warn "Could not run 'direnv allow' automatically — run it manually: direnv allow"
  fi
}

# ─── final ─────────────────────────────────────────────────────────────────

print_next_steps() {
  step "Next steps"

  cat <<EOF

  1. Load env vars into your shell via direnv:
       direnv allow
     Verify:
       echo \$JIRA_PAT      (should print your token)

     If direnv hook isn't in your shell yet:
       echo 'eval "\$(direnv hook zsh)"' >> ~/.zshrc   # or ~/.bashrc
       exec zsh

  2. Launch Claude Code (or Cursor) **from this shell** so it inherits the env:
       code .    # or: cursor .
     IDEs launched from Finder/Spotlight will NOT see the env vars.

  3. In Claude Code:
     - Trust the workspace
     - Trust the 'claude-plugins-official' marketplace when prompted
     - Install the project plugins when prompted (or run explicitly), then /reload-plugins:
         /plugin install superpowers@claude-plugins-official
         /plugin install typescript-lsp@claude-plugins-official       # LSP code-intelligence
         /plugin install security-guidance@claude-plugins-official    # in-session security review
     - /mcp  → internal-jira + figma are already enabled in committed settings.json:
         internal-jira ✓ connected
         figma  → OAuth prompt in browser on first use (no token needed here)

  4. Try it:
       /work PROJ-XYZ

  Per-dev .env (loaded into shell via direnv from .envrc → .claude/.env):
      $ENV_FILE

  To re-run setup any time:
      ./scripts/setup-claude.sh

EOF
}

# ─── main ──────────────────────────────────────────────────────────────────

main() {
  echo
  step "Spec-driven workflow setup"
  echo

  load_env
  check_prereqs
  activate_toolchain
  setup_agentic_scripts
  setup_internal_jira_mcp
  setup_jira_auth
  setup_figma_auth
  setup_app_env_files
  allow_direnv
  print_next_steps

  echo
  ok "Setup complete."
}

main "$@"
