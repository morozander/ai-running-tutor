---
name: iaac-terragrunt
description: Terragrunt module structure, environment.hcl pattern, change safety
globs: ["iaac/**/*.hcl", "iaac/**/*.tf"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Terragrunt Conventions

This monorepo uses **Terragrunt** wrapping Terraform. Layout:

```
iaac/
├── terragrunt/
│   ├── root.hcl                     # Global config — backend, provider, common inputs
│   ├── shared/
│   │   ├── environment.hcl          # Shared env vars
│   │   └── eu-central-1/
│   │       ├── region.hcl
│   │       ├── ecr/terragrunt.hcl
│   │       ├── gitlab-ci-user/terragrunt.hcl
│   │       ├── grafana/terragrunt.hcl
│   │       └── ...
│   ├── dev/
│   │   ├── environment.hcl
│   │   ├── mise.toml
│   │   └── eu-central-1/
│   │       ├── region.hcl
│   │       ├── vpc/terragrunt.hcl
│   │       ├── rds-aurora/terragrunt.hcl
│   │       ├── cognito/terragrunt.hcl
│   │       ├── apigw/terragrunt.hcl
│   │       ├── lambdas/terragrunt.hcl
│   │       ├── s3/terragrunt.hcl
│   │       ├── cloudfront/terragrunt.hcl
│   │       ├── security-groups/terragrunt.hcl
│   │       ├── jumpbox/terragrunt.hcl
│   │       └── secrets-manager/terragrunt.hcl
│   ├── staging/(mirror of dev)
│   └── production/(mirror of dev)
├── scripts/
│   ├── bootstrap.sh                 # initial AWS state bucket + IAM setup
│   └── rotate-credentials.sh
└── docs/
    ├── README.md, QUICKSTART.md, BOOTSTRAP.md, CHECKLIST.md, ...
```

## Layered config

Each `terragrunt.hcl` inherits from `root.hcl` and its `environment.hcl` / `region.hcl`:

```hcl
# dev/eu-central-1/rds-aurora/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "environment" {
  path = find_in_parent_folders("environment.hcl")
  expose = true
}

include "region" {
  path = find_in_parent_folders("region.hcl")
  expose = true
}

terraform {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-rds-aurora.git?ref=v9.x.x"
}

inputs = {
  # illustrative — real env locals (THIS repo) are `environment` + `aws_profile`;
  # root.hcl injects application_id + environment as default inputs
  name = "${include.environment.locals.environment}-monorepo-aurora"
  engine = "aurora-postgresql"
  engine_version = "15.4"
  # ...
}
```

## Change rules

### 1. **Who applies — the decision boundary.**

Agents and the spec-flow run `validate` and `plan` ONLY — never `apply`, `destroy`, `import`, or `state rm`. The `.claude/hooks/pre-tool-use.sh` hook enforces this for Claude Code; **for Cursor and any other tool, this rule is the only guard.** `apply` belongs to humans and CI: WHEN your task needs a resource to exist before code works, list it as a **Deployment Prerequisite** in the plan/MR (`/handoff` surfaces these) — do not apply it yourself.

What merging actually triggers (THIS repo — `.gitlab/ci/iaac.gitlab-ci.yml`): `deploy-dev` applies on pushes to `main` touching `iaac/**`; `deploy-staging` on `release/*` branches touching `iaac/**` (same changes filter); `deploy-production` on `v*.*.*` tags. Each job injects CI keys + assumes a per-env role (`.gitlab/ci/scripts/iaac_pre_apply.sh`), then runs `terragrunt run --all apply --non-interactive`. There is **no terragrunt-plan gate** in CI — the CI `validate` stage runs checkov/trivy/gitleaks-style scans, not `terragrunt plan`. The staged flow `MR → plan → reviewer approves → apply dev → staging → production` is **TARGET state (aspiration), not the current pipeline** — do not describe it as what merging does today.

### 2. **State is sacred.** S3 state is created by `bootstrap.sh` once. Never edit state files. Never `terraform state rm` without senior review.

### 3. **Versions are pinned.** Pin module sources to a specific tag (`?ref=v9.0.1`), not `main`. Bump deliberately.

Provider pinning lives in each unit's **committed `.terraform.lock.hcl`** (THIS repo tracks them). WHEN `init`/`plan` rewrites a lock file you didn't intend to touch → that's provider drift; treat the lock diff as a reviewable change in its own right. Never delete or regenerate a lock file to make `init` pass — that silently unpins every provider in the unit.

### 4. **No secrets in `.hcl` files.** Read from `aws_secretsmanager_secret_version` or pass via environment variables. See [secrets.md](./secrets.md).

### 5. **Inputs go through `environment.hcl`.** When the same value differs across environments, parameterize it; never hardcode in a module's `terragrunt.hcl`.

The real `environment.hcl` files (THIS repo) are minimal — env name + profile; `root.hcl` injects `application_id` and `environment` as default inputs:

```hcl
# iaac/terragrunt/dev/environment.hcl (THIS repo)
locals {
  environment = "dev"
  aws_profile = get_env("G_AWS_PROFILE")
}
```

Per-env values like an RDS instance class go here too WHEN they diverge across environments — that's the signal to parameterize.

WHEN a raw 12-digit AWS account ID (or a hardcoded ARN embedding one) appears in a unit's `inputs` → hoist it to the env-level hcl, or derive it (`get_aws_account_id()`, `aws_caller_identity` data source) and reference it. Repeated literals across units are the signal that a value belongs a layer up — scattered account IDs are how a copy-pasted unit silently targets the wrong account.

## Required environment contract (THIS repo)

`iaac/terragrunt/root.hcl` reads `G_APPLICATION_ID`, `G_AWS_PROFILE_SHARED`, `G_AWS_REGION_DEFAULT` via `get_env()` with **no fallback**, and each env's `environment.hcl` reads `G_AWS_PROFILE` — EXCEPT `shared/environment.hcl`, which reads `G_AWS_PROFILE_SHARED` (shared modules like ecr/grafana are real, CI-applied targets). The defaults come from mise, not terragrunt: the root `mise.toml` `[env]` block supplies `g-monorepo` / `g-monorepo` / `eu-central-1` (and exports `AWS_PROFILE`), and each `iaac/terragrunt/<env>/mise.toml` defaults `G_AWS_PROFILE` (e.g. `g-monorepo-dev`). Inside an active mise environment you do NOT hand-export these; **outside mise (CI, bare shells) they must be exported** or `terragrunt` fails before reaching AWS. A missing-env failure is a `blocked`/environment problem, not a code fix — see [aws-credentials.md](./aws-credentials.md).

Note the dual-profile surface: the state backend authenticates with `G_AWS_PROFILE_SHARED`, the provider with the per-env `G_AWS_PROFILE` — probe both before planning ([aws-credentials.md](./aws-credentials.md)).

## State locking

State locking is **S3-native** (`use_lockfile = true` in `root.hcl`; no DynamoDB lock table — THIS repo).

- **Verification reads, deployments lock**: run verification/CI-less plans with `terragrunt plan -lock=false` so a read-only check never takes the lock and contends with a real CI apply.
- WHEN a command fails with a state-lock error (signal: "Error acquiring the state lock" / lock ID in the message) → someone or something else is mid-operation, possibly a real CI apply. Report it as `blocked`, naming who holds the lock from the error text. **Never `force-unlock` from the flow — that is a human-only call.**

## Reading a plan — exit 0 is not a safe plan

A plan that exits 0 can still describe a disaster. The question to ask: **would applying this plan destroy data or identities?**

- WHEN the plan shows a **replacement** (`-/+`, "forces replacement", "must be replaced") or **deletion** of a *stateful* resource — one holding data or identities not recreatable from code (e.g. THIS repo: the Aurora cluster, the Cognito user pool; elsewhere: S3 buckets with data, queues with messages, Secrets Manager entries) → **ESCALATE to a human even when the plan exits 0 and even when the task intended a change there**. Name the resource address and the attribute forcing the replacement.
- WHEN resources outside the modules the task declared appear in the diff → scope is leaking (shared locals, provider defaults changed) — escalate, don't shrug.
- WHEN an IAM policy or security-group rule widens (new `*` action, new `0.0.0.0/0`) → security review regardless of exit code.
- Adds and in-place updates of stateless resources, or tag/metadata-only churn → normal; proceed and note it.

"Stateful" is a judgment about the blast radius, not a fixed resource list — the signal is whether destroy-and-recreate loses something an apply cannot restore.

**Authoring-time counterpart:** WHEN you author (or discover the hard way) an input whose change forces replacement of a stateful resource → leave a `WARNING` comment **at that input** naming the blast radius and the recovery step (e.g. "switching encryption RECREATES the ECR repo — its images are deleted; re-run the publish workflow after apply"). The next plan-reader, human or agent, inherits the knowledge instead of rediscovering it in a plan diff.

**Plan output is sensitive**: attribute values can embed endpoints, identifiers, occasionally connection material. Report resource **counts + addresses + the dangerous actions** — never paste raw plan output into reports or MR descriptions.

## Naming

| Resource | Pattern | Example |
|---|---|---|
| AWS resources | `<env>-<project>-<service>` | `dev-monorepo-aurora`, `prod-monorepo-api` |
| S3 buckets | `<env>-<project>-<purpose>-<random>` | `dev-monorepo-frontend-7a3b` |
| IAM roles | `<env>-<project>-<service>-role` | `dev-monorepo-lambda-role` |
| Security groups | `<env>-<project>-<purpose>-sg` | `dev-monorepo-rds-sg` |
| Tags | Provider `default_tags` apply `Application` + `Environment` to everything (THIS repo — `root.hcl`); add purpose tags at resource level when needed | |
| State bucket | `${application_id}-${account_id}-tfstates` (THIS repo — `root.hcl` remote_state) | |

The patterns/examples are illustrations of THIS repo's conventions — derive the actual ones from `root.hcl` + `environment.hcl`, don't assume.

## Workflow commands (agents/flow: read + plan only)

```bash
cd iaac/terragrunt/dev/eu-central-1/vpc

mise exec -- terragrunt init               # initialize (needs live creds for the state backend)
mise exec -- terragrunt validate           # syntax/config check
mise exec -- terragrunt plan -lock=false   # preview changes WITHOUT taking the state lock
mise exec -- terragrunt output             # read outputs

# Run all modules in a folder (use carefully)
cd iaac/terragrunt/dev/eu-central-1
mise exec -- terragrunt run-all plan -lock=false
```

`apply` and `destroy` are deliberately absent: they are human/CI deployment steps (see §Who applies). WHEN a task needs them, that's a Deployment Prerequisite in the MR, not a local command.

## Pre-commit

`.pre-commit-config.yaml` enforces:

- `hcl-fmt` — HCL formatting
- `checkov` — security misconfig scan (HIGH/CRITICAL block commits)
- Trivy secret scan

## Hard rules

- ❌ `terragrunt apply`/`destroy`/`import`/`state rm` from an agent or the flow — anywhere, any env (validate + plan only; apply is human/CI via Deployment Prerequisites)
- ❌ `terragrunt apply` against production from a developer machine
- ❌ `force-unlock` from the flow — a state lock means a real operation may be running; humans only
- ❌ Pasting raw plan output into reports/MRs — summarize counts + resource addresses + dangerous actions
- ❌ Editing state files
- ❌ Pinning modules to `main` or no `ref` at all
- ❌ Deleting or regenerating a `.terraform.lock.hcl` to silence an init/provider error — the lock diff is the review surface for provider drift
- ❌ Secrets in `.hcl` or `.tf` files
- ❌ Diverging staging from production for environment-specific values not declared in `environment.hcl`
- ❌ Skipping `terragrunt plan` before apply
- ❌ Committing `.terragrunt-cache/` or `.terraform/` (already in `.gitignore`, but worth restating)
