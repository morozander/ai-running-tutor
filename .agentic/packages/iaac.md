# IaC Package — AI Context

## Stack

- **Terragrunt 0.55+** wrapping Terraform 1.7+
- **AWS** (eu-central-1 primary region)
- **Modules**: VPC, RDS Aurora Postgres, Cognito, API Gateway (HTTP v2), Lambda, S3, CloudFront, Bedrock, SQS/SNS, ECR, Grafana, Secrets Manager
- **State**: S3 backend (created by `bootstrap.sh`)
- **CI**: GitLab CI applies infrastructure; engineers run plans locally

## Folder layout

```
iaac/
├── terragrunt/
│   ├── root.hcl                  # Global: backend, provider, common inputs
│   ├── shared/
│   │   ├── environment.hcl
│   │   └── eu-central-1/         # Cross-env: ECR, Grafana, GitLab CI user
│   ├── dev/
│   │   ├── environment.hcl
│   │   └── eu-central-1/
│   │       ├── region.hcl
│   │       ├── vpc/, rds-aurora/, cognito/, apigw/, lambdas/
│   │       ├── s3/, cloudfront/, security-groups/, jumpbox/, secrets-manager/
│   ├── staging/  (mirror of dev)
│   └── production/ (mirror of dev)
├── scripts/
│   ├── bootstrap.sh              # Initial AWS state bucket + IAM setup
│   └── rotate-credentials.sh
└── docs/
    ├── README.md, QUICKSTART.md, BOOTSTRAP.md
    ├── GITLAB_VARIABLES.md       # full CI variable list
    ├── CHECKLIST.md, CODE_REVIEW.md, INDEX.md, SUMMARY.md
```

## Key conventions

- **All resource names**: `<env>-<project>-<service>` (e.g., `dev-monorepo-aurora`)
- **Default tags** come from the provider block in `root.hcl` (THIS repo: `Application` + `Environment`); add resource-level purpose tags only when needed — see [rules/iaac/aws-resources.md](../rules/iaac/aws-resources.md)
- **Module sources pinned** to a specific tag (`?ref=v9.0.1`) — never `main`
- **Secrets** in AWS Secrets Manager — never in `.hcl` files or Lambda env vars
- **State** is sacred — never edit, never `state rm`/`force-unlock` (human-only, senior review)
- **Who applies**: agents/flow run `validate` + `plan` ONLY — `apply`/`destroy` belong to humans/CI (surfaced via /handoff Deployment Prerequisites); see [rules/iaac/terragrunt.md](../rules/iaac/terragrunt.md) + [rules/iaac/aws-credentials.md](../rules/iaac/aws-credentials.md)

## Commands (agents: read + plan only)

```bash
cd iaac/terragrunt/<env>/<region>/<module>   # e.g. (THIS repo): dev/eu-central-1

mise exec -- terragrunt init
mise exec -- terragrunt plan -lock=false   # verification plans never take the state lock
mise exec -- terragrunt output

# Run all modules in a folder
cd iaac/terragrunt/<env>/<region>
mise exec -- terragrunt run-all plan -lock=false
# apply/destroy: humans/CI only — deliberately absent here
```

## Pre-commit hooks

`.pre-commit-config.yaml` enforces:

- `hcl-fmt` — HCL formatting
- `checkov` — security misconfig scan (HIGH/CRITICAL block)
- Trivy secret scan

## Relevant rule files

- [Terragrunt conventions](../rules/iaac/terragrunt.md)
- [AWS resource conventions](../rules/iaac/aws-resources.md)
- [Secrets handling](../rules/iaac/secrets.md)

## External docs

- [iaac/docs/README.md](../../iaac/docs/README.md) — full IaC reference
- [iaac/docs/QUICKSTART.md](../../iaac/docs/QUICKSTART.md) — onboard a new engineer
- [iaac/docs/BOOTSTRAP.md](../../iaac/docs/BOOTSTRAP.md) — initial AWS account setup
- [iaac/docs/GITLAB_VARIABLES.md](../../iaac/docs/GITLAB_VARIABLES.md) — CI variable matrix
