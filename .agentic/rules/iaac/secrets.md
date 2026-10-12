---
name: iaac-secrets
description: Secrets handling — Secrets Manager, .env files, rotation, audit
globs: ["iaac/**/*", "**/.env*", "**/secrets/**"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Secrets and Credentials

## Inventory — where secrets live

| Type | Storage |
|---|---|
| Database master credentials | AWS Secrets Manager + RDS native rotation |
| Cognito app client secret | AWS Secrets Manager |
| Third-party API keys (SendGrid, Bedrock, etc.) | AWS Secrets Manager |
| AWS access keys (CI runners) | GitLab CI variables (masked, protected) |
| Local dev `.env` files | Per-developer; **never committed**; sourced from password manager / vault |
| GitLab Personal Access Tokens | GitLab CI variables |
| Cognito user passwords | Cognito (we don't store them — Cognito handles hashing) |

## Hard rules

### Never commit secrets

- ❌ `.env`, `.env.local`, `*.pem`, `*.key`, `id_rsa`, `credentials.json` — already in `.gitignore`; verify before committing
- ❌ Hardcoded API keys in TS/JS files — use `process.env.X` + dotenv locally + Secrets Manager in deployed envs
- ❌ Secrets in `terragrunt.hcl` `inputs` blocks — read from Secrets Manager via `aws_secretsmanager_secret_version` data source
- ❌ Secrets in Lambda environment variables (visible in console & TF state). Fetch at runtime instead.
- ❌ Plain-text secrets in CI/CD logs — mask GitLab variables; sanitize log output

### Never log secrets

```ts
// ❌
logger.info(`Connecting with ${dbUrl}`);

// ✅
logger.info(`Connecting to ${parseHost(dbUrl)}`);
```

Sanitize before logging — extract host/port only, never the credential portion.

### Create vs populate — IaC owns secret CONTAINERS, never VALUES

- Terraform creates the Secrets Manager / SSM entry with a **placeholder** value and `lifecycle { ignore_changes }` on the value attribute (`secret_string` / SSM `value`); a human (or a rotation Lambda) populates the real value post-apply.
- Document the exact populate command in a comment **at the unit** (e.g. `aws secretsmanager put-secret-value --secret-id <name> --secret-string '...'` — value comes from the password manager into the shell, never into git).
- WHEN a plan diff shows a secret VALUE changing → something is writing secrets *through* Terraform, which lands them in state — escalate, don't apply around it.
- Seeding via `random_password` is NOT a loophole — the generated credential lands in TF state all the same. (RDS master credentials are the exception path: AWS-native rotation manages the value; TF never holds it.)

### Rotation

- RDS master credentials: **rotation enabled** via Secrets Manager native rotation (30 days dev, 90 days prod)
- Third-party API keys: rotated manually via [rotate-credentials.sh](../../../iaac/scripts/rotate-credentials.sh); calendar reminder every 6 months minimum
- GitLab CI tokens: rotated quarterly
- Compromise response: **rotate immediately**, audit access logs in CloudTrail

### Access audit

- All Secrets Manager `GetSecretValue` calls are logged in CloudTrail
- Production secret access requires the role; the role is granted only to specific Lambda functions
- Engineers do NOT have direct production secret access — break-glass via approved process

## Local `.env` files

Each app (`backend/`, `frontend/`, `mobile/`) has an `.env.example` showing required variables with placeholder values. Developers copy to `.env` and fill from the team password manager.

```bash
# .env.example (committed)
DB_HOST=
DB_PORT=5432
DB_NAME=monorepo
DB_USER=
DB_PASSWORD=

COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=

# .env (never committed)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=monorepo_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

## Reading secrets in deployed code

```ts
// Backend Lambda
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
const { SecretString } = await sm.send(
  new GetSecretValueCommand({ SecretId: 'dev/monorepo/db/master' }),
);
const { username, password } = JSON.parse(SecretString!);
```

Cache for the duration of the Lambda execution context (`let staticSecret` at module scope). Don't refetch on every invocation.

## Scanning

`.pre-commit-config.yaml` runs:

- **Trivy** secret scan — blocks commits containing API keys, AWS access keys, etc.
- **Checkov** — IaC misconfig scan including hard-coded secrets in `.tf` / `.hcl`

If a secret slips through:

1. **Rotate immediately** — assume the secret is compromised
2. Remove from git history (`git filter-repo` or BFG)
3. Force-push (only on feature branches; coordinate if on a shared branch)
4. Notify the team

## CI variables

GitLab CI variables used for deployments:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — **masked** and **protected** (visible only on protected branches)
- `JIRA_PAT`, `GITLAB_PAT` — masked
- Environment-specific URLs / IDs — not masked (not secrets)

See [iaac/docs/GITLAB_VARIABLES.md](../../../iaac/docs/GITLAB_VARIABLES.md) for the full list.

## Hard rules summary

- ❌ Secrets in code, in `.hcl`, in env vars, in logs
- ❌ Committing `.env`
- ❌ Long-lived API keys without rotation
- ❌ Production access without audit logging
- ❌ Engineers fetching production secrets directly — go through the approved Lambda or break-glass process
