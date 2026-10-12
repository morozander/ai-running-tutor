#!/bin/bash
set -euo pipefail

# Bootstrap — First-time setup: S3 state bucket, EC2 key pair, IAM user + per-env roles,
# GitHub Actions secrets, per-env environment.hcl, clean Git history. Idempotent;
# re-run to update/sync.
# Usage: ./bootstrap.sh [--check] [--keep-history]
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAAC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$IAAC_DIR/.." && pwd)"

export AWS_PAGER=""

# Repositories treated as "the original" template (g-monorepo). Bootstrap NEVER
# rewrites history when origin points at one of these. Space-separated owner/repo.
TEMPLATE_REPO_SLUGS="${TEMPLATE_REPO_SLUGS:-geniusee-software/monorepo geniusee-software/g-monorepo}"

INITIAL_BRANCH="${BOOTSTRAP_INITIAL_BRANCH:-main}"
INITIAL_COMMIT_MESSAGE="${BOOTSTRAP_INITIAL_COMMIT_MESSAGE:-chore: initial commit}"

KEEP_HISTORY=false          # --keep-history / BOOTSTRAP_KEEP_HISTORY=1
HISTORY_RESET_DONE=false
GIT_BACKUP_DIR=""

# ─── Colors ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ─── Logging ─────────────────────────────────────────────────────────────────

log_info()    { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }
log_success() { echo -e "${GREEN}${BOLD}✓ $1${NC}"; }

divider() { echo -e "${DIM}──────────────────────────────────────────────────────────────${NC}"; }

# env_name → AWS profile (dev/staging/production)
get_env_profile() {
  local e="$1" p
  case "$e" in
    dev) p="${AWS_DEV_PROFILE_INPUT:-}" ;;
    staging) p="${AWS_STAGE_PROFILE_INPUT:-}" ;;
    production) p="${AWS_PROD_PROFILE_INPUT:-}" ;;
    *) p="" ;;
  esac
  echo "${p:-${APPLICATION_ID}-${e}}"
}

# ─── Prompt helper ───────────────────────────────────────────────────────────

prompt() {
  local var_name="$1"
  local prompt_text="$2"
  local default_value="${3:-}"
  local value

  if [ -n "$default_value" ]; then
    read -rp "$(echo -e "${BOLD}$prompt_text${NC} ${DIM}[$default_value]${NC}: ")" value
    value="${value:-$default_value}"
  else
    while true; do
      read -rp "$(echo -e "${BOLD}$prompt_text${NC}: ")" value
      [ -n "$value" ] && break
      log_error "This field is required."
    done
  fi

  eval "$var_name=\"$value\""
}

# ─── GitHub helpers ────────────────────────────────────────────────────────

detect_github_remote() {
  local remote_url
  remote_url=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")

  if [ -z "$remote_url" ]; then
    return 1
  fi

  # SSH format: git@github.com:geniusee-software/monorepo.git
  if [[ "$remote_url" =~ ^git@([^:]+):(.+)\.git$ ]]; then
    GITHUB_HOST="${BASH_REMATCH[1]}"
    GITHUB_REPO="${BASH_REMATCH[2]}"
  # HTTPS format: https://github.com/geniusee-software/monorepo.git
  elif [[ "$remote_url" =~ ^https?://([^/]+)/(.+)\.git$ ]]; then
    GITHUB_HOST="${BASH_REMATCH[1]}"
    GITHUB_REPO="${BASH_REMATCH[2]}"
  else
    return 1
  fi

  GITHUB_PROJECT_URL="https://${GITHUB_HOST}/${GITHUB_REPO}"
  return 0
}

# Set a GitHub Actions secret (repo-level by default, or for a given environment).
# Usage: set_github_secret KEY VALUE [environment]
# GitHub Actions secrets are always masked in logs, so there is no masked flag.
set_github_secret() {
  local key="$1"
  local value="$2"
  local environment="${3:-}"

  local args=(secret set "$key" --repo "$GITHUB_REPO")
  local scope="repo"
  if [ -n "$environment" ]; then
    args+=(--env "$environment")
    scope="env:${environment}"
  fi

  # Value passed via stdin to safely handle multiline secrets (e.g. SSH keys).
  if printf '%s' "$value" | gh "${args[@]}" >/dev/null 2>&1; then
    log_info "  ✓ ${key} [${scope}]"
    return 0
  fi

  log_error "  ✗ ${key} [${scope}] — gh secret set failed"
  return 1
}

# Ensure a GitHub Actions environment exists (idempotent). Required before
# setting environment-scoped secrets. PUT is idempotent, so re-runs are safe.
# Deliberately created WITHOUT protection rules so deploys run hands-off; add
# required reviewers on `production` manually if you want an approval gate.
ensure_github_environment() {
  local env_name="$1"
  if gh api --method PUT -H "Accept: application/vnd.github+json" \
      "repos/${GITHUB_REPO}/environments/${env_name}" >/dev/null 2>&1; then
    log_info "  ✓ environment ${env_name}"
    return 0
  fi
  log_error "  ✗ environment ${env_name} — gh api create failed"
  return 1
}

# ─── Git history ─────────────────────────────────────────────────────────────

# owner/repo out of any remote URL (scp-style, ssh://, https://), lowercased.
remote_slug() {
  local url="${1%.git}"
  url="${url##*://}"      # drop scheme
  url="${url#*@}"         # drop user@
  url="${url/:/\/}"       # scp-style colon → slash
  local path="${url#*/}"  # drop host
  echo "$path" | tr '[:upper:]' '[:lower:]'
}

# True when the given remote URL is one of the template repositories.
is_template_remote_url() {
  local slug template
  slug=$(remote_slug "$1")
  for template in $TEMPLATE_REPO_SLUGS; do
    [ "$slug" = "$(echo "$template" | tr '[:upper:]' '[:lower:]')" ] && return 0
  done
  return 1
}

# Sets TEMPLATE_REMOTE_NAME / TEMPLATE_REMOTE_URL when this checkout is the
# template repo itself. `origin` decides; a template URL on some other remote
# (e.g. an intentional `upstream`) is not treated as "this is the original".
detect_template_remote() {
  TEMPLATE_REMOTE_NAME=""
  TEMPLATE_REMOTE_URL=""

  local origin_url
  origin_url=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")

  if [ -n "$origin_url" ]; then
    if is_template_remote_url "$origin_url"; then
      TEMPLATE_REMOTE_NAME="origin"
      TEMPLATE_REMOTE_URL="$origin_url"
      return 0
    fi
    return 1
  fi

  # No origin — fall back to any remote so a renamed template checkout is still caught.
  local name url
  while read -r name url _; do
    if is_template_remote_url "$url"; then
      TEMPLATE_REMOTE_NAME="$name"
      TEMPLATE_REMOTE_URL="$url"
      return 0
    fi
  done < <(git -C "$REPO_ROOT" remote -v 2>/dev/null | awk '$3 == "(fetch)"')

  return 1
}

# Drop secrets produced by this script from the index, even if a stray .gitignore
# edit stopped covering them — the initial commit gets pushed to a real remote.
unstage_secrets() {
  local staged f
  staged=$(git -C "$REPO_ROOT" diff --cached --name-only \
    | grep -E '(^|/)\.keys/|\.pem$|(^|/)gitlab-ci-credentials-.*\.txt$' || true)
  [ -z "$staged" ] && return 0

  log_warn "  Keeping secret files out of the initial commit:"
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    echo -e "    ${DIM}- ${f}${NC}"
    git -C "$REPO_ROOT" rm -q --cached --ignore-unmatch -- "$f" >/dev/null 2>&1 || true
  done <<< "$staged"
}

# Replace the template's Git history with a single initial commit, so every
# bootstrapped project starts clean. The original g-monorepo is never rewritten
# (guard below), and the old .git is moved aside as a backup rather than deleted.
reset_git_history() {
  log_step "Resetting Git history (clean initial commit)"

  if [ "$KEEP_HISTORY" = true ] || [ "${BOOTSTRAP_KEEP_HISTORY:-0}" = "1" ]; then
    log_warn "History reset disabled (--keep-history) — Git history left untouched."
    return 0
  fi

  if ! git -C "$REPO_ROOT" rev-parse --git-dir &>/dev/null; then
    log_warn "${REPO_ROOT} is not a Git repository — nothing to reset."
    log_info "  Start one with: git init --initial-branch=${INITIAL_BRANCH} && git add . && git commit -m \"${INITIAL_COMMIT_MESSAGE}\""
    return 0
  fi

  # ── Guard 1: never rewrite the template repository itself ──
  if detect_template_remote; then
    log_warn "Remote '${TEMPLATE_REMOTE_NAME}' points at the template repo: ${TEMPLATE_REMOTE_URL}"
    log_warn "This is the original g-monorepo — its history is preserved, nothing was changed."
    log_info "  Bootstrapping a new project? Point origin at your own empty repo and re-run:"
    log_info "    ${DIM}git remote set-url origin git@github.com:<owner>/<new-repo>.git${NC}"
    return 0
  fi

  # ── Guard 2: only rewrite a standalone repo whose root is this repo ──
  # Compared physically: git reports resolved paths, REPO_ROOT may contain symlinks.
  local toplevel repo_root_real
  toplevel=$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "")
  repo_root_real=$(cd "$REPO_ROOT" && pwd -P)
  if [ -z "$toplevel" ] || [ "$(cd "$toplevel" 2>/dev/null && pwd -P)" != "$repo_root_real" ]; then
    log_warn "Git root is ${toplevel:-unknown}, not ${REPO_ROOT} (nested repo/submodule) — skipping history reset."
    return 0
  fi
  if [ ! -d "${REPO_ROOT}/.git" ]; then
    log_warn "${REPO_ROOT}/.git is not a directory (worktree or submodule) — skipping history reset."
    return 0
  fi

  # ── Guard 3: a commit needs an identity; check before touching anything ──
  local git_user git_email
  git_user=$(git -C "$REPO_ROOT" config user.name || echo "")
  git_email=$(git -C "$REPO_ROOT" config user.email || echo "")
  if [ -z "$git_user" ] || [ -z "$git_email" ]; then
    log_warn "Git identity is not configured — skipping history reset (nothing was changed)."
    log_info "  ${DIM}git config --global user.name \"Your Name\" && git config --global user.email \"you@example.com\"${NC}"
    return 0
  fi

  local commit_count
  commit_count=$(git -C "$REPO_ROOT" rev-list --count HEAD 2>/dev/null || echo 0)

  # Fresh `git init` with no commits: just create the initial commit.
  if [ "$commit_count" -eq 0 ]; then
    log_info "No commits yet — creating the initial commit."
    git -C "$REPO_ROOT" add -A
    unstage_secrets
    git -C "$REPO_ROOT" commit -q -m "$INITIAL_COMMIT_MESSAGE"
    HISTORY_RESET_DONE=true
    log_success "Initial commit created on $(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
    return 0
  fi

  if [ "$commit_count" -eq 1 ]; then
    log_info "History already starts at a single initial commit — nothing to reset."
    return 0
  fi

  # ── Confirm ──
  local current_branch
  current_branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")
  local backup_name=".git-history-backup-$(date +%Y%m%d-%H%M%S)"

  divider
  echo -e "  ${BOLD}Replace Git history with one initial commit?${NC}"
  echo -e "  ${DIM}Current:${NC} ${commit_count} commit(s) on ${current_branch} (inherited from the template)."
  echo -e "  ${DIM}After:${NC}   1 commit \"${INITIAL_COMMIT_MESSAGE}\" on ${INITIAL_BRANCH}; remotes are kept."
  echo -e "  ${DIM}The old .git is moved to ${backup_name}/ — delete it once you are happy.${NC}"
  divider
  local answer
  read -rp "$(echo -e "${BOLD}Reset history? (yes/no)${NC} ${DIM}[yes]${NC}: ")" answer
  answer="${answer:-yes}"
  if [[ ! "$answer" =~ ^(yes|y|true|1)$ ]]; then
    log_warn "Skipped — Git history left untouched."
    return 0
  fi

  # ── Preserve remotes, then re-init ──
  local remote_lines=() line name url
  while read -r name url _; do
    remote_lines+=("${name} ${url}")
  done < <(git -C "$REPO_ROOT" remote -v 2>/dev/null | awk '$3 == "(fetch)"')

  GIT_BACKUP_DIR="${REPO_ROOT}/${backup_name}"
  mv "${REPO_ROOT}/.git" "$GIT_BACKUP_DIR"
  log_info "Old history backed up: ${backup_name}/"

  # Ignore the backup before it can be picked up by `git add -A`.
  if ! grep -qxF '.git-history-backup-*/' "${REPO_ROOT}/.gitignore" 2>/dev/null; then
    printf '\n# Git history backup left by bootstrap\n.git-history-backup-*/\n' >> "${REPO_ROOT}/.gitignore"
  fi

  if ! git -C "$REPO_ROOT" init --initial-branch="$INITIAL_BRANCH" >/dev/null 2>&1; then
    # git < 2.28 has no --initial-branch
    git -C "$REPO_ROOT" init >/dev/null
    git -C "$REPO_ROOT" symbolic-ref HEAD "refs/heads/${INITIAL_BRANCH}"
  fi

  for line in "${remote_lines[@]:-}"; do
    [ -z "$line" ] && continue
    name="${line%% *}"
    url="${line#* }"
    git -C "$REPO_ROOT" remote add "$name" "$url" 2>/dev/null \
      || git -C "$REPO_ROOT" remote set-url "$name" "$url"
    log_info "  ✓ remote ${name} → ${url}"
  done

  git -C "$REPO_ROOT" add -A
  unstage_secrets
  git -C "$REPO_ROOT" commit -q -m "$INITIAL_COMMIT_MESSAGE"

  HISTORY_RESET_DONE=true
  log_success "History reset — 1 commit on ${INITIAL_BRANCH} (backup: ${backup_name}/)"
}

# --- Prerequisites ---
check_prerequisites() {
  log_step "Checking prerequisites"
  local missing=()
  command -v aws &>/dev/null || missing+=("aws — https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html")
  command -v jq &>/dev/null || missing+=("jq — brew install jq")
  command -v curl &>/dev/null || missing+=("curl — brew install curl")
  command -v git &>/dev/null || missing+=("git — brew install git")
  command -v gh &>/dev/null || missing+=("gh — https://cli.github.com (brew install gh)")
  command -v ssh-keygen &>/dev/null || missing+=("ssh-keygen — install OpenSSH")
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required tools:"
    for tool in "${missing[@]}"; do echo -e "  ${RED}•${NC} $tool"; done
    exit 1
  fi
  if ! gh auth status &>/dev/null; then
    log_error "GitHub CLI is not authenticated. Run: gh auth login"
    exit 1
  fi
  log_success "All prerequisites met (aws, jq, curl, git, gh, ssh-keygen)"
}

# --- Gather information ---
gather_information() {
  log_step "Gathering project information"
  divider

  prompt APPLICATION_ID \
    "Application ID (project name, e.g. enverse, beepic)" \
    "${G_APPLICATION_ID:-}"

  prompt AWS_PROFILE_INPUT \
    "AWS SHARED profile to use" \
    "${AWS_PROFILE:-default}"

  prompt AWS_DEV_PROFILE_INPUT \
      "AWS dev profile to use" \
      "${AWS_DEV_PROFILE:-dev}"

  prompt AWS_STAGE_PROFILE_INPUT \
        "AWS stage profile to use" \
        "${AWS_STAGE_PROFILE:-stage}"

  prompt AWS_PROD_PROFILE_INPUT \
          "AWS prod profile to use" \
          "${AWS_PROD_PROFILE:-prod}"

  prompt AWS_REGION \
    "AWS region" \
    "${G_AWS_REGION_DEFAULT:-eu-central-1}"

  prompt CI_IAM_USER_NAME \
    "IAM username for CI (GitHub Actions)" \
    "gitlab-ci-terraform"

  divider
  echo -e "  ${BOLD}Which environments should be set up? (optional — say no to skip an env)${NC}"
  for env_name in dev staging production; do
    local default="yes"
    read -rp "$(echo -e "  Set up ${BOLD}${env_name}${NC}? (yes/no) [${default}]: ")" answer
    answer="${answer:-$default}"
    local env_upper
    env_upper=$(echo "$env_name" | tr '[:lower:]' '[:upper:]' | tr -d '-')
    # SETUP_DEV, SETUP_STAGING, SETUP_PRODUCTION
    eval "SETUP_${env_upper}=\"${answer}\""
  done
  divider

  # Detect GitHub remote
  if detect_github_remote; then
    log_info "Detected GitHub repository: ${GITHUB_PROJECT_URL}"
    if detect_template_remote; then
      log_warn "'${TEMPLATE_REMOTE_NAME}' still points at the template repo (g-monorepo)."
      log_warn "Secrets would land there and the Git history will NOT be reset."
      log_warn "For a new project, run: git remote set-url origin git@github.com:<owner>/<new-repo>.git"
    fi
  else
    log_warn "Could not detect GitHub remote from git origin."
    prompt GITHUB_HOST "GitHub hostname" "github.com"
    prompt GITHUB_REPO "GitHub repository (owner/repo, e.g. geniusee-software/monorepo)"
    GITHUB_PROJECT_URL="https://${GITHUB_HOST}/${GITHUB_REPO}"
  fi
}

# --- Confirmation ---
env_is_enabled() {
  local env_name="$1"
  local env_upper
  env_upper=$(echo "$env_name" | tr '[:lower:]' '[:upper:]' | tr -d '-')
  local var_name="SETUP_${env_upper}"
  local val="${!var_name:-yes}"
  [[ "$val" =~ ^(yes|y|true|1)$ ]]
}

confirm_information() {
  log_step "Please confirm the following configuration"
  divider
  echo -e "  ${BOLD}Application ID:${NC}      ${APPLICATION_ID}"
  echo -e "  ${BOLD}AWS Region:${NC}          ${AWS_REGION}"
  echo -e "  ${BOLD}CI:${NC} 1 IAM user ${CI_IAM_USER_NAME}"
  local envs_list=""
  for e in dev staging production; do env_is_enabled "$e" && envs_list="${envs_list}${e} "; done
  echo -e "  ${BOLD}Envs to set up:${NC}     ${envs_list:-'(none)'}"
  echo -e "  ${BOLD}GitHub Repository:${NC}   ${GITHUB_PROJECT_URL}"
  echo -e "  ${BOLD}AWS profiles (env):${NC}"
  echo -e "    ${DIM}shared:${NC}  ${AWS_PROFILE_INPUT}"
  echo -e "    ${DIM}dev:${NC}     ${AWS_DEV_PROFILE_INPUT}"
  echo -e "    ${DIM}stage:${NC}   ${AWS_STAGE_PROFILE_INPUT}"
  echo -e "    ${DIM}prod:${NC}    ${AWS_PROD_PROFILE_INPUT}"
  divider

  read -rp "$(echo -e "${BOLD}Is this correct? (yes/no):${NC} ")" confirm
  if [[ "$confirm" != "yes" && "$confirm" != "y" ]]; then
    log_warn "Aborted. Re-run the script to try again."
    exit 0
  fi
}

# --- Check existing resources (--check only) ---
check_existing_resources() {
  log_step "Checking existing resources (no creates)"
  S3_BUCKET_NAME="${APPLICATION_ID}-${AWS_ACCOUNT_ID}-tfstates"
  EC2_KEY_NAME="${APPLICATION_ID}"

  local ok=0 missing=0

  if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" --profile "$AWS_PROFILE_INPUT" 2>/dev/null; then
    log_info "  ✓ S3 bucket exists: ${S3_BUCKET_NAME}"
    ((ok++))
  else
    log_warn "  ✗ S3 bucket missing: ${S3_BUCKET_NAME}"
    ((missing++))
  fi

  if aws ec2 describe-key-pairs --key-names "$EC2_KEY_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE_INPUT" &>/dev/null; then
    log_info "  ✓ EC2 key pair exists: ${EC2_KEY_NAME} (${AWS_REGION})"
    ((ok++))
  else
    log_warn "  ✗ EC2 key pair missing: ${EC2_KEY_NAME}"
    ((missing++))
  fi

  if aws iam get-user --user-name "$CI_IAM_USER_NAME" --profile "$AWS_PROFILE_INPUT" &>/dev/null; then
    log_info "  ✓ IAM user exists: ${CI_IAM_USER_NAME}"
    ((ok++))
  else
    log_warn "  ✗ IAM user missing: ${CI_IAM_USER_NAME}"
    ((missing++))
  fi

  for env_name in dev staging production; do
    if ! env_is_enabled "$env_name"; then
      continue
    fi
    local env_profile
    env_profile=$(get_env_profile "$env_name")
    local role_name="${APPLICATION_ID}-${env_name}-deploy"
    if aws iam get-role --role-name "$role_name" --profile "$env_profile" &>/dev/null; then
      log_info "  ✓ IAM role exists [${env_name}]: ${role_name} (profile: ${env_profile})"
      ((ok++))
    else
      log_warn "  ✗ IAM role missing [${env_name}]: ${role_name} (check profile: ${env_profile})"
      ((missing++))
    fi
  done

  echo ""
  if [ "$missing" -eq 0 ]; then
    log_success "All checked resources exist (${ok} items). Re-run without --check to update GitHub secrets or environment.hcl."
  else
    log_warn "Found ${missing} missing resource(s). Run without --check to create them."
  fi
}

# --- Validate AWS access ---
validate_aws_access() {
  log_step "Validating AWS access"

  local identity
  identity=$(aws sts get-caller-identity --profile "$AWS_PROFILE_INPUT" --output json 2>&1) || {
    log_error "AWS CLI could not authenticate with profile '${AWS_PROFILE_INPUT}'."
    log_error "Make sure 'aws configure --profile ${AWS_PROFILE_INPUT}' has been run."
    log_error "Output: $identity"
    exit 1
  }

  AWS_ACCOUNT_ID=$(echo "$identity" | jq -r '.Account')
  local caller_arn
  caller_arn=$(echo "$identity" | jq -r '.Arn')

  log_info "AWS Account ID : ${AWS_ACCOUNT_ID}"
  log_info "Caller ARN     : ${caller_arn}"

  S3_BUCKET_NAME="${APPLICATION_ID}-${AWS_ACCOUNT_ID}-tfstates"
  EC2_KEY_NAME="${APPLICATION_ID}"

  log_success "AWS access validated"
}

# --- S3 state bucket ---
create_s3_bucket() {
  log_step "Creating S3 bucket for Terraform state: ${S3_BUCKET_NAME}"

  if ! aws s3api head-bucket --bucket "$S3_BUCKET_NAME" --profile "$AWS_PROFILE_INPUT" 2>/dev/null; then
    local extra=()
    [ "$AWS_REGION" != "us-east-1" ] && extra=(--create-bucket-configuration "LocationConstraint=$AWS_REGION")
    aws s3api create-bucket --bucket "$S3_BUCKET_NAME" --profile "$AWS_PROFILE_INPUT" --region "$AWS_REGION" "${extra[@]}"
    log_info "Bucket created."
  else
    log_warn "Bucket already exists — skipping creation."
  fi

  aws s3api put-bucket-versioning \
    --bucket "$S3_BUCKET_NAME" \
    --profile "$AWS_PROFILE_INPUT" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$S3_BUCKET_NAME" \
    --profile "$AWS_PROFILE_INPUT" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": { "SSEAlgorithm": "AES256" },
        "BucketKeyEnabled": true
      }]
    }'

  aws s3api put-public-access-block \
    --bucket "$S3_BUCKET_NAME" \
    --profile "$AWS_PROFILE_INPUT" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

  log_success "S3 bucket ready (versioning + encryption + public access blocked)"
}

# --- EC2 key pair ---
key_pair_exists_in_account() {
  local profile="$1"
  aws ec2 describe-key-pairs --key-names "$EC2_KEY_NAME" --region "$AWS_REGION" --profile "$profile" &>/dev/null
}

create_ec2_key_pair() {
  log_step "Creating EC2 key pair: ${EC2_KEY_NAME} (region: ${AWS_REGION})"
  local env_profile

  # Check shared account first; if key exists there we don't have the private key to import elsewhere
  if key_pair_exists_in_account "$AWS_PROFILE_INPUT"; then
    log_warn "Key pair already exists in shared account (${AWS_REGION}) — skipping creation."
    log_info "  Checking enabled env accounts for same key..."
    local missing_in=()
    for env_name in dev staging production; do
      if ! env_is_enabled "$env_name"; then continue; fi
      env_profile=$(get_env_profile "$env_name")
      if ! key_pair_exists_in_account "$env_profile"; then
        missing_in+=("${env_name} (${env_profile})")
      fi
    done
    if [ ${#missing_in[@]} -gt 0 ]; then
      log_warn "  Key pair missing in: ${missing_in[*]}. Import the same public key manually or re-run bootstrap without the key in shared."
    fi
    SSH_PRIVATE_KEY_FILE=""
    SSH_PUBLIC_KEY_FILE=""
    return
  fi

  local key_dir="${IAAC_DIR}/.keys"
  mkdir -p "$key_dir"

  local private_key_file="${key_dir}/${EC2_KEY_NAME}"
  local public_key_file="${private_key_file}.pub"

  ssh-keygen -t ed25519 -f "$private_key_file" -N "" -C "EC2 key for ${APPLICATION_ID}" -q

  local public_key_b64
  public_key_b64=$(base64 < "$public_key_file" | tr -d '\n')

  # Import into shared account
  aws ec2 import-key-pair \
    --key-name "$EC2_KEY_NAME" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE_INPUT" \
    --public-key-material "$public_key_b64"
  log_info "  Imported key into shared account."

  for env_name in dev staging production; do
    if ! env_is_enabled "$env_name"; then continue; fi
    env_profile=$(get_env_profile "$env_name")
    if key_pair_exists_in_account "$env_profile"; then
      log_warn "  Key already exists in ${env_name} (${env_profile}) — skip import."
    else
      aws ec2 import-key-pair \
        --key-name "$EC2_KEY_NAME" \
        --region "$AWS_REGION" \
        --profile "$env_profile" \
        --public-key-material "$public_key_b64" && log_info "  Imported key into ${env_name} (${env_profile})." || log_warn "  Failed to import key into ${env_name} (${env_profile})."
    fi
  done

  SSH_PRIVATE_KEY_FILE="$private_key_file"
  SSH_PUBLIC_KEY_FILE="$public_key_file"

  log_success "Key pair created — private key: ${private_key_file}"
  log_warn "Keep this file secure and do NOT commit it to version control."
}

# --- IAM user + per-env roles ---
create_iam_role_for_env() {
  local env_name="$1"
  local role_name="${APPLICATION_ID}-${env_name}-deploy"
  # Shared account user (created in shared acc) will assume this role
  local user_arn="arn:aws:iam::${AWS_ACCOUNT_ID}:user/${CI_IAM_USER_NAME}"

  local env_profile
  env_profile=$(get_env_profile "$env_name")
  local env_account_id
  env_account_id=$(aws sts get-caller-identity --profile "$env_profile" --output json 2>/dev/null | jq -r '.Account') || {
    log_error "  Could not get identity for profile ${env_profile} (${env_name} account). Check AWS config."
    return 1
  }
  log_info "  ${env_name} account ID: ${env_account_id} (profile: ${env_profile})"

  local trust_policy
  trust_policy=$(jq -n \
    --arg user_arn "$user_arn" \
    '{
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: { AWS: $user_arn },
        Action: "sts:AssumeRole"
      }]
    }')

  if aws iam get-role --role-name "$role_name" --profile "$env_profile" &>/dev/null; then
    log_warn "  IAM role ${role_name} already exists in ${env_name} account — updating trust policy."
    aws iam update-assume-role-policy \
      --role-name "$role_name" \
      --policy-document "$trust_policy" \
      --profile "$env_profile"
    log_info "  Trust policy updated so ${CI_IAM_USER_NAME} can assume ${role_name}."
  else
    aws iam create-role \
      --role-name "$role_name" \
      --assume-role-policy-document "$trust_policy" \
      --profile "$env_profile" \
      --description "CI deploy role for ${APPLICATION_ID} ${env_name}"
    log_info "  IAM role created: ${role_name} (in ${env_name} account)"
  fi

  local admin_policy_arn="arn:aws:iam::aws:policy/AdministratorAccess"
  aws iam attach-role-policy \
    --role-name "$role_name" \
    --profile "$env_profile" \
    --policy-arn "$admin_policy_arn" 2>/dev/null || true

  # Role ARN is in the env account (dev/staging/prod), not shared
  local role_arn="arn:aws:iam::${env_account_id}:role/${role_name}"
  local env_upper
  env_upper=$(echo "$env_name" | tr '[:lower:]' '[:upper:]')
  eval "ENV_AWS_ROLE_ARN_${env_upper}=\"${role_arn}\""
}

create_iam_user_and_credentials() {
  # Single IAM user — used for Terragrunt state and to assume per-env roles
  log_step "Creating IAM user for CI: ${CI_IAM_USER_NAME}"

  if aws iam get-user --user-name "$CI_IAM_USER_NAME" --profile "$AWS_PROFILE_INPUT" &>/dev/null; then
    log_warn "IAM user already exists — skipping user creation."
  else
    aws iam create-user \
      --user-name "$CI_IAM_USER_NAME" \
      --profile "$AWS_PROFILE_INPUT" \
      --tags Key=Application,Value="$APPLICATION_ID" Key=Purpose,Value="gitlab-ci"
    log_info "IAM user created."
  fi

  local admin_policy_arn="arn:aws:iam::aws:policy/AdministratorAccess"
  aws iam attach-user-policy \
    --user-name "$CI_IAM_USER_NAME" \
    --profile "$AWS_PROFILE_INPUT" \
    --policy-arn "$admin_policy_arn" 2>/dev/null || true

  log_info "Generating static access key..."
  local access_key_output
  access_key_output=$(aws iam create-access-key \
    --user-name "$CI_IAM_USER_NAME" \
    --profile "$AWS_PROFILE_INPUT" \
    --output json 2>/dev/null || echo "")

  # Idempotent self-heal: AWS allows at most 2 access keys per user. If creation
  # failed because the limit is reached (e.g. leftover keys from a previous
  # setup whose secrets we can no longer retrieve), rotate by deleting the
  # OLDEST key and retrying — so a re-run always yields an uploadable key.
  # Set BOOTSTRAP_NO_KEY_ROTATE=1 to disable this and fail loudly instead.
  if [ -z "$access_key_output" ] && [ "${BOOTSTRAP_NO_KEY_ROTATE:-0}" != "1" ]; then
    local oldest_key
    oldest_key=$(aws iam list-access-keys \
      --user-name "$CI_IAM_USER_NAME" \
      --profile "$AWS_PROFILE_INPUT" \
      --query 'sort_by(AccessKeyMetadata,&CreateDate)[0].AccessKeyId' \
      --output text 2>/dev/null || echo "")
    if [ -n "$oldest_key" ] && [ "$oldest_key" != "None" ]; then
      log_warn "Access key limit reached — rotating: deleting oldest key ${oldest_key}."
      aws iam delete-access-key \
        --user-name "$CI_IAM_USER_NAME" \
        --access-key-id "$oldest_key" \
        --profile "$AWS_PROFILE_INPUT" 2>/dev/null || true
      access_key_output=$(aws iam create-access-key \
        --user-name "$CI_IAM_USER_NAME" \
        --profile "$AWS_PROFILE_INPUT" \
        --output json 2>/dev/null || echo "")
    fi
  fi

  if [ -n "$access_key_output" ]; then
    CI_AWS_ACCESS_KEY_ID=$(echo "$access_key_output" | jq -r '.AccessKey.AccessKeyId')
    CI_AWS_SECRET_ACCESS_KEY=$(echo "$access_key_output" | jq -r '.AccessKey.SecretAccessKey')
    divider
    echo -e "  ${BOLD}AWS_ACCESS_KEY_ID:${NC}     ${CI_AWS_ACCESS_KEY_ID}"
    echo -e "  ${BOLD}AWS_SECRET_ACCESS_KEY:${NC} (saved, not shown)"
    divider
    local creds_file="${IAAC_DIR}/.keys/gitlab-ci-credentials-$(date +%Y%m%d-%H%M%S).txt"
    mkdir -p "$(dirname "$creds_file")"
    cat > "$creds_file" <<EOF
CI/CD AWS Credentials (one user — use for state + assume role per env)
Generated: $(date)
Application ID: ${APPLICATION_ID}
AWS Account ID: ${AWS_ACCOUNT_ID}

AWS_ACCESS_KEY_ID=${CI_AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${CI_AWS_SECRET_ACCESS_KEY}
AWS_DEFAULT_REGION=${AWS_REGION}

S3 State Bucket: ${S3_BUCKET_NAME}

Per-env: use AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY to assume ENV_AWS_ROLE_ARN (set as GitHub Environment secret per env).
EOF
    log_info "Credentials saved to: ${creds_file}"
    log_warn "This secret is shown only once. Keep the file safe."
  else
    log_error "Could not create access key. The user may already have 2 keys (AWS limit)."
    log_error "List existing keys: aws iam list-access-keys --user-name ${CI_IAM_USER_NAME} --profile ${AWS_PROFILE_INPUT}"
    CI_AWS_ACCESS_KEY_ID=""
    CI_AWS_SECRET_ACCESS_KEY=""
  fi

  log_success "IAM user configured"

  # Per-environment IAM roles (only for envs selected in setup); each role is in that env's AWS account
  log_step "Creating IAM role per environment (only for selected envs)"
  local role_arns=()
  for env_name in dev staging production; do
    if env_is_enabled "$env_name"; then
      log_info "Environment: ${env_name}"
      create_iam_role_for_env "$env_name" && {
        local env_upper
        env_upper=$(echo "$env_name" | tr '[:lower:]' '[:upper:]')
        local role_arn_var="ENV_AWS_ROLE_ARN_${env_upper}"
        [ -n "${!role_arn_var:-}" ] && role_arns+=("${!role_arn_var}")
      }
    else
      log_info "Skipping ${env_name} (not selected for setup)."
    fi
  done

  # Allow user to assume only the per-env roles we created
  if [ ${#role_arns[@]} -gt 0 ]; then
    local assume_policy
    assume_policy=$(jq -n \
      --argjson roles "$(printf '%s\n' "${role_arns[@]}" | jq -R . | jq -s .)" \
      '{ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: "sts:AssumeRole", Resource: $roles }] }')
    aws iam put-user-policy \
      --user-name "$CI_IAM_USER_NAME" \
      --profile "$AWS_PROFILE_INPUT" \
      --policy-name "AssumeEnvRoles" \
      --policy-document "$assume_policy"
    log_info "User policy AssumeEnvRoles: can assume ${#role_arns[@]} role(s)"
  fi

  log_success "Per-environment roles created (for selected envs); one user, assume role per env in CI."
}

# --- GitHub Actions secrets ---
github_integration() {
  log_step "GitHub Actions Integration"
  echo ""
  echo -e "  Secrets are set via the ${BOLD}GitHub CLI${NC} (already authenticated as):"
  echo -e "  ${CYAN}$(gh auth status 2>&1 | grep -o 'account [^ ]*' | head -1 || echo 'gh')${NC}"
  echo -e "  ${DIM}Target repository: ${GITHUB_REPO}${NC}"
  divider

  if ! gh auth status &>/dev/null; then
    log_warn "GitHub CLI not authenticated — skipping secret upload."
    log_warn "Authenticate with 'gh auth login' and re-run, or add secrets manually."
    log_info "Go to: ${GITHUB_PROJECT_URL}/settings/secrets/actions"
    GITHUB_UPLOAD_SKIPPED=true
    return
  fi

  GITHUB_UPLOAD_SKIPPED=false
  log_info "Uploading Actions secrets to GitHub (${GITHUB_REPO})..."

  local failed=0

  # Core AWS credentials (repo-level secrets)
  if [ -n "${CI_AWS_ACCESS_KEY_ID:-}" ]; then
    set_github_secret "AWS_ACCESS_KEY_ID" "$CI_AWS_ACCESS_KEY_ID" || ((failed++))
    set_github_secret "AWS_SECRET_ACCESS_KEY" "$CI_AWS_SECRET_ACCESS_KEY" || ((failed++))
  else
    log_warn "No static credentials available — skipping AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY."
  fi

  # Region & profile (repo-level)
  set_github_secret "AWS_DEFAULT_REGION" "$AWS_REGION" || ((failed++))
  set_github_secret "AWS_PROFILE" "${APPLICATION_ID}-shared" || ((failed++))

  # Terragrunt env variables (repo-level / global)
  set_github_secret "G_APPLICATION_ID" "$APPLICATION_ID" || ((failed++))
  set_github_secret "G_AWS_REGION_DEFAULT" "$AWS_REGION" || ((failed++))
  set_github_secret "G_AWS_PROFILE_SHARED" "${APPLICATION_ID}-shared" || ((failed++))

  # Per-environment: ENV_AWS_ROLE_ARN, G_AWS_PROFILE (GitHub Environment secrets)
  for env_name in dev staging production; do
    if ! env_is_enabled "$env_name"; then
      log_info "Skipping GitHub env secrets for ${env_name} (not selected for setup)."
      continue
    fi

    local env_upper
    env_upper=$(echo "$env_name" | tr '[:lower:]' '[:upper:]' | tr -d '-')
    local role_arn_var="ENV_AWS_ROLE_ARN_${env_upper}"
    local role_arn="${!role_arn_var:-}"
    local profile_value
    profile_value=$(get_env_profile "$env_name")

    if [ -n "$role_arn" ]; then
      ensure_github_environment "$env_name" || ((failed++))
      set_github_secret "ENV_AWS_ROLE_ARN" "$role_arn" "$env_name" || ((failed++))
      set_github_secret "G_AWS_PROFILE" "$profile_value" "$env_name" || ((failed++))
    else
      log_warn "No role ARN for env ${env_name} — skipping. Re-run bootstrap with ${env_name} enabled."
    fi
  done

  # SSH private key (for git clone inside CI)
  if [ -n "${SSH_PRIVATE_KEY_FILE:-}" ] && [ -f "$SSH_PRIVATE_KEY_FILE" ]; then
    local ssh_key_content
    ssh_key_content=$(cat "$SSH_PRIVATE_KEY_FILE")
    set_github_secret "SSH_PRIVATE_KEY" "$ssh_key_content" || ((failed++))
  else
    log_warn "No SSH private key file found — skipping SSH_PRIVATE_KEY upload."
    log_warn "Add it manually if you already have a key pair."
  fi

  # Deploy key for the private Terraform modules repo (gsnake-modules), on GitHub.
  # The SSH_PRIVATE_KEY secret above lets CI clone it; this adds the public half
  # as a read-only deploy key via the GitHub CLI. Non-interactive and idempotent:
  # if a key with the same title already exists, it is left as-is.
  if [ -n "${SSH_PUBLIC_KEY_FILE:-}" ] && [ -f "$SSH_PUBLIC_KEY_FILE" ]; then
    local ssh_public_key_content gsnake_repo deploy_key_title
    ssh_public_key_content=$(cat "$SSH_PUBLIC_KEY_FILE")
    gsnake_repo="${GSNAKE_REPO:-geniusee-software/gsnake-modules}"
    deploy_key_title="${APPLICATION_ID}-monorepo"
    log_step "Deploy key for ${gsnake_repo} (GitHub)"

    if gh api "repos/${gsnake_repo}/keys" --jq '.[].title' 2>/dev/null | grep -qx "$deploy_key_title"; then
      log_info "  ⊘ Deploy key '${deploy_key_title}' already exists — skipping."
    elif gh repo deploy-key add "$SSH_PUBLIC_KEY_FILE" \
           --repo "$gsnake_repo" --title "$deploy_key_title" >/dev/null 2>&1; then
      log_success "Deploy key added to ${gsnake_repo}: ${deploy_key_title}"
    else
      log_warn "Could not add deploy key automatically (lack admin access to ${gsnake_repo}?)."
      log_info "  Add it manually: https://github.com/${gsnake_repo}/settings/keys"
      log_info "  Title: ${deploy_key_title}"
      log_info "  Public key: ${ssh_public_key_content}"
      ((failed++))
    fi
  else
    log_warn "No SSH public key file found — cannot add deploy key to the modules repo."
    log_warn "Add it manually: https://github.com/${GSNAKE_REPO:-geniusee-software/gsnake-modules}/settings/keys"
  fi

  if [ "$failed" -gt 0 ]; then
    log_warn "${failed} secret(s) failed to upload. Check errors above."
  else
    log_success "All Actions secrets uploaded to GitHub"
  fi
}

# --- Generate per-environment environment.hcl ---
generate_environment_hcl() {
  log_step "Generating per-environment environment.hcl"

  local terragrunt_dir="${IAAC_DIR}/terragrunt"
  for env_name in dev staging production; do
    if ! env_is_enabled "$env_name"; then
      log_info "Skipping ${env_name} (not selected for setup)."
      continue
    fi
    local env_file="${terragrunt_dir}/${env_name}/environment.hcl"
    mkdir -p "$(dirname "$env_file")"
    cat > "$env_file" <<EOF
locals {
  environment = "${env_name}"
  aws_profile = get_env("G_AWS_PROFILE")
}
EOF
    log_success "Generated ${env_file}"
  done
}

# --- Generate per-environment mise.toml ---
generate_mise_toml() {
  log_step "Generating per-environment mise.toml (AWS profile selection)"

  local terragrunt_dir="${IAAC_DIR}/terragrunt"
  for env_name in dev staging production; do
    if ! env_is_enabled "$env_name"; then
      log_info "Skipping mise.toml for ${env_name} (not selected for setup)."
      continue
    fi
    local profile_value
    profile_value=$(get_env_profile "$env_name")
    local mise_file="${terragrunt_dir}/${env_name}/mise.toml"
    mkdir -p "$(dirname "$mise_file")"
    cat > "$mise_file" <<MISE
#──────────────────────────────────────────────────────────────────────────────
# ENVIRONMENT VARIABLES
#──────────────────────────────────────────────────────────────────────────────
[env]
G_AWS_PROFILE = "{{ env.G_AWS_PROFILE | default(value='${profile_value}') }}"
MISE
    log_success "Generated ${mise_file} (default profile: ${profile_value})"
  done
}

# --- Summary ---
print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║              Bootstrap completed successfully           ║"
  echo "  ╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo -e "  ${BOLD}Application ID:${NC}      ${APPLICATION_ID}"
  echo -e "  ${BOLD}AWS Account ID:${NC}      ${AWS_ACCOUNT_ID}"
  echo -e "  ${BOLD}AWS Region:${NC}          ${AWS_REGION}"
  echo -e "  ${BOLD}S3 State Bucket:${NC}     ${S3_BUCKET_NAME}"
  echo -e "  ${BOLD}EC2 Key Pair:${NC}        ${EC2_KEY_NAME}"
  echo -e "  ${BOLD}IAM User:${NC}            ${CI_IAM_USER_NAME}"
  echo -e "  ${BOLD}GitHub Repository:${NC}   ${GITHUB_PROJECT_URL}"
  if [ "$HISTORY_RESET_DONE" = true ]; then
    echo -e "  ${BOLD}Git History:${NC}         clean — 1 commit on ${INITIAL_BRANCH}"
  fi
  echo ""
  divider

  echo -e "  ${BOLD}Next steps:${NC}"
  echo ""

  local step=1


  if [ "${GITHUB_UPLOAD_SKIPPED:-true}" = "true" ]; then
      echo -e "  ${step}. Add Actions secrets to GitHub manually:"
      echo -e "     ${CYAN}${GITHUB_PROJECT_URL}/settings/secrets/actions${NC}"
      echo -e "     See iaac/docs/GITHUB_SECRETS.md for the full list."
      ((step++))
    fi

  echo -e "  ${step}. Test infrastructure locally (environment.hcl sets aws_profile per env):"
  echo -e "     ${DIM}cd iaac/terragrunt/dev/eu-central-1/vpc && terragrunt init && terragrunt plan${NC}"
  ((step++))

  if [ "$HISTORY_RESET_DONE" = true ]; then
    echo -e "  ${step}. Push the clean initial commit to trigger the CI/CD pipeline:"
    echo -e "     ${DIM}git push -u origin ${INITIAL_BRANCH}${NC}"
    ((step++))
    if [ -n "$GIT_BACKUP_DIR" ]; then
      echo -e "  ${step}. Once the push looks good, drop the old history backup:"
      echo -e "     ${DIM}rm -rf ${GIT_BACKUP_DIR}${NC}"
    fi
  else
    echo -e "  ${step}. Push to ${INITIAL_BRANCH} to trigger the CI/CD pipeline:"
    echo -e "     ${DIM}git add . && git commit -m \"bootstrap: initial setup\" && git push${NC}"
  fi

  divider
}

# --- Main ---
main() {
  echo ""
  echo -e "${CYAN}${BOLD}  ┌──────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}${BOLD}  │         Project Bootstrap Script             │${NC}"
  echo -e "${CYAN}${BOLD}  └──────────────────────────────────────────────┘${NC}"
  echo ""

  local check_only=false
  local arg
  for arg in "$@"; do
    case "$arg" in
      --check)         check_only=true ;;
      --keep-history)  KEEP_HISTORY=true ;;
      -h|--help)
        echo "Usage: $(basename "$0") [--check] [--keep-history]"
        echo ""
        echo "  --check          Report existing resources; create nothing, touch no Git history."
        echo "  --keep-history   Keep the inherited Git history instead of starting from a"
        echo "                   single initial commit (same as BOOTSTRAP_KEEP_HISTORY=1)."
        return 0
        ;;
      *) log_warn "Unknown option: ${arg} (see --help)" ;;
    esac
  done

  check_prerequisites
  gather_information
  confirm_information
  validate_aws_access

  if [ "$check_only" = true ]; then
    check_existing_resources
    return 0
  fi

  create_s3_bucket
  create_ec2_key_pair
  create_iam_user_and_credentials
  github_integration
  generate_environment_hcl
  generate_mise_toml
  reset_git_history
  print_summary
}

main "$@"
