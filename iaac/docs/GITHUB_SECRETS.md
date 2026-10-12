# GitHub Actions Secrets Configuration

This document lists the GitHub Actions secrets required by the CI/CD workflows
(infrastructure, backend, frontend, PR environments).

**Quick reference:** For **first-time setup** or **key rotation**, run
`iaac/scripts/bootstrap.sh` (uploads secrets automatically via the GitHub CLI) or
`iaac/scripts/rotate-credentials.sh` and then update `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`. All secrets can also be set manually as described below.

## 📍 Where to Configure

**GitHub repo → Settings → Secrets and variables → Actions**

- **Repository secrets** — global values (AWS credentials, region, app id, SSH key).
- **Environment secrets** — per-environment values (`ENV_AWS_ROLE_ARN`, `G_AWS_PROFILE`)
  under **Settings → Environments → {dev,staging,production}**.

You can also use the CLI:

```bash
# Repository secret
gh secret set AWS_ACCESS_KEY_ID --repo <owner>/<repo>

# Environment secret (per-env)
gh secret set ENV_AWS_ROLE_ARN --env dev --repo <owner>/<repo>
```

> GitHub Actions secrets are always masked in logs — there is no separate "masked" flag.
> Protect production by configuring **required reviewers** on the `production` environment.

## 🔐 Repository secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key (from `bootstrap.sh` / `rotate-credentials.sh`) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_DEFAULT_REGION` | AWS region (e.g. `eu-central-1`) |
| `AWS_PROFILE` | Shared profile name (e.g. `<app>-shared`) |
| `G_APPLICATION_ID` | Application id (Terragrunt `root.hcl`, ECR, post_apply) |
| `G_AWS_REGION_DEFAULT` | Default region for Terragrunt state |
| `G_AWS_PROFILE_SHARED` | Same value as `AWS_PROFILE` (Terragrunt env files) |
| `SSH_PRIVATE_KEY` | ED25519 private key used for SSH in `iaac_pre_apply.sh` |

## 🌍 Environment secrets (dev / staging / production)

| Secret | Description |
|--------|-------------|
| `ENV_AWS_ROLE_ARN` | Per-env IAM role ARN assumed by deploy jobs |
| `G_AWS_PROFILE` | Per-env AWS profile name written by `iaac_pre_apply.sh` |

## 🧩 Optional secrets

| Secret | Used by | Description |
|--------|---------|-------------|
| `SONAR_HOST_URL` | `sonarqube.yml` | SonarQube server URL |
| `SONAR_TOKEN` | `sonarqube.yml` | SonarQube analysis token |
| `RENOVATE_TOKEN` | `renovate.yml` | GitHub PAT for Renovate (repo + PR scope) |
| `SLACK_WEBHOOK_URL` | `pr-environment.yml` | Optional Slack notification for PR previews |

Backend/frontend deploy jobs receive ECR URL, Lambda names, S3 bucket, CloudFront ID, etc.
from the `build.env` artifact produced by the `dotenv` job (Terragrunt outputs); **do not**
set those as secrets.

## ✅ Verification

After configuring secrets, push to `main` (or run a workflow via **Actions → Run workflow**)
and confirm the deploy pipeline can assume the role:

```bash
aws sts get-caller-identity
```

## 🔄 Rotation

Rotate the IAM user keys periodically (e.g. every 90 days):

```bash
cd iaac && ./scripts/rotate-credentials.sh
```

Then update `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (repo secrets) and delete the old
IAM access key once a pipeline run confirms the new key works.
