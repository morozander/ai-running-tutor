#!/bin/sh
set -ex

INCLUDE_MODULES="${TERRAGRUNT_INCLUDE_MODULES:-secrets-manager cognito}"

ENV_PATH="${GITHUB_WORKSPACE}/iaac/terragrunt/${NAME}/eu-central-1"
SHARED_PATH="${GITHUB_WORKSPACE}/iaac/terragrunt/shared/eu-central-1"
TERRAGRUNT_ROOT="${GITHUB_WORKSPACE}/iaac/terragrunt"
ALL_MODULES_APPLIED=true

for check_module in vpc lambdas/app/main; do
  if cd "${ENV_PATH}/${check_module}" && terragrunt output --json 2>/dev/null | jq -e 'keys | length > 0' >/dev/null 2>&1; then
    echo "${check_module} exists"
  else
    echo "${check_module} does not exist — full apply required"
    ALL_MODULES_APPLIED=false
    break
  fi
done

if [ "$ALL_MODULES_APPLIED" = "true" ] && [ -n "$INCLUDE_MODULES" ]; then
  echo "All modules applied — running only: $INCLUDE_MODULES"
  cd "$ENV_PATH"
  set -- terragrunt run --all apply --non-interactive --parallelism 5
  for module in $INCLUDE_MODULES; do
    set -- "$@" --filter "./${module}"
  done
  echo "Command: $*"
  "$@"
else
  echo "First run or partial failure — applying ALL modules (shared + ${NAME})"
  # Run from terragrunt root so both shared and env modules are discovered.
  # Filter to shared + target env only (skip other envs).
  cd "$TERRAGRUNT_ROOT"
  terragrunt run --all apply --non-interactive --parallelism 5 --backend-bootstrap \
    --filter "./shared/eu-central-1/**" \
    --filter "./${NAME}/eu-central-1/**"
fi
