# Monorepo setup guide

**Main setup doc for this repo.** How to set up and run the full stack (infrastructure, backend, frontend) locally and via GitHub Actions.

## Project overview

| Part | Tech | Purpose |
|------|------|--------|
| **iaac/** | Terragrunt + Terraform | AWS infra: VPC, RDS, Cognito, API Gateway, Lambda, S3, CloudFront, etc. |
| **backend/** | NestJS, MikroORM, GraphQL | API and Lambda functions (main + cron + Cognito triggers) |
| **frontend/** | React, Vite, Apollo, AWS Amplify | SPA; builds to S3, served via CloudFront |

**Pipeline (GitHub Actions):** the reusable `_deploy.yml` workflow runs the stages below; it is
called by `deploy-dev.yml`, `deploy-staging.yml` and `deploy-production.yml`.

- **infra** (Terragrunt apply; runs only when `iaac/**` changes, gated via `dorny/paths-filter`).
- **dotenv** (reads Terragrunt outputs, writes `build.env` + Secrets Manager; uploaded as an artifact).
- **build-backend** (BuildKit → ECR).
- **deploy-backend** (Lambda update from ECR).
- **build-frontend** (Node build; consumes the `build.env` artifact).
- **deploy-frontend** (S3 sync + CloudFront invalidation).

Environments:

- **dev**: branch `main` (`deploy-dev.yml`).
- **staging**: branches `release/*` (`deploy-staging.yml`).
- **production**: tags `v*.*.*` (`deploy-production.yml`).

---

## Prerequisites

- **Node.js** ≥ 20 (backend/frontend).
- **pnpm** ≥ 9 (backend; frontend uses npm in CI, pnpm locally per `package.json`).
- **Docker** (local backend DB; CI uses BuildKit for backend image).
- **AWS CLI** (local IaC; CI uses variables).
- **Terragrunt** ≥ 0.55.1, **Terraform** ≥ 1.7.3 (local IaC; CI uses `alpine/terragrunt:tf1.14.5`).
- **jq** (bootstrap and CI scripts).
- **GitHub** repository with Actions enabled and runners able to run container jobs (Docker/BuildKit) and the AWS CLI.

---

## GitHub Actions secrets

Configure under **Settings → Secrets and variables → Actions** (repository secrets), and per-environment
secrets under **Settings → Environments → {dev,staging,production}**. Required for the pipeline to run.

### Repository secrets (infrastructure, backend, frontend)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user used by Terragrunt in CI (e.g. from `iaac/scripts/bootstrap.sh`) |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret key |
| `AWS_DEFAULT_REGION` | AWS region (e.g. `eu-central-1`) |
| `AWS_PROFILE` | Shared profile name written by `iaac_pre_apply.sh` (e.g. `<app>-shared`) |
| `G_APPLICATION_ID` | Application id used in Terragrunt (`root.hcl`, ECR key, post_apply) |
| `G_AWS_PROFILE_SHARED` | Same value as `AWS_PROFILE`; used by Terragrunt env files |
| `G_AWS_REGION_DEFAULT` | Default region for Terragrunt state (e.g. `eu-central-1`) |
| `SSH_PRIVATE_KEY` | Private key (e.g. ED25519) for SSH in `iaac_pre_apply.sh` |

### Environment secrets (dev / staging / production)

| Secret | Description |
|--------|-------------|
| `ENV_AWS_ROLE_ARN` | Per-env IAM role ARN assumed by deploy jobs |
| `G_AWS_PROFILE` | Per-env AWS profile name written by `iaac_pre_apply.sh` |

Backend and frontend deploy jobs get ECR URL, Lambda names, S3 bucket, CloudFront ID, etc. from the **`build.env` artifact** produced by the `dotenv` job (from Terragrunt outputs and `iaac_post_apply.sh`). You do **not** set those as secrets.

Full list (and optional secrets like `SONAR_TOKEN`, `RENOVATE_TOKEN`, `SLACK_WEBHOOK_URL`) are in [iaac/docs/GITHUB_SECRETS.md](iaac/docs/GITHUB_SECRETS.md).

---

## Setup order (first-time / new environment)

1. **Bootstrap AWS and get CI credentials**  
   **Full Bootstrap procedure (recommended):** [docs/BOOTSTRAP.md](iaac/docs/BOOTSTRAP.md) — download repo, Git init, run `make`, `gh auth login`, modules-repo deploy key.  
   Alternatively see [iaac/docs/QUICKSTART.md](iaac/docs/QUICKSTART.md) and [iaac/docs/README.md](iaac/docs/README.md).  
   - Set `G_APPLICATION_ID`, `G_AWS_REGION_DEFAULT`, and (locally) `AWS_PROFILE`.  
   - Run `iaac/scripts/bootstrap.sh` (or `make` from repo root); it uploads the secrets to GitHub via `gh`.  
   - For **key rotation** later, run `iaac/scripts/rotate-credentials.sh` and update the two AWS keys in GitHub (see [iaac/docs/GITHUB_SECRETS.md](iaac/docs/GITHUB_SECRETS.md)).

2. **Configure GitHub secrets**  
   `bootstrap.sh` sets them automatically, or add all secrets from the tables above (and optional ones from `iaac/docs/GITHUB_SECRETS.md`).  
   Use the same profile name for `AWS_PROFILE` and `G_AWS_PROFILE_SHARED`.

3. **Run infrastructure (so dotenv and app deploys can run)**  
   - Push a change under **iaac/** to `main`.  
   - The deploy workflow runs the **infra** job (only when `iaac/**` changes).  
   - After it succeeds, the **dotenv** job produces the `build.env` artifact.

4. **Backend and frontend**  
   - The **build-backend** / **deploy-backend** jobs consume the `build.env` artifact from the **dotenv** job.  
   - The **build-frontend** / **deploy-frontend** jobs do the same.  
   After the first successful **infra** + **dotenv**, subsequent pushes to `main` build and deploy backend and frontend.

5. **Staging / production**  
   - Staging: push branch `release/*` → `deploy-staging.yml`.  
   - Production: push tag `v*.*.*` → `deploy-production.yml`.

---

## Pipeline behavior (reference)

- The **infra** job runs only when there are **changes under `iaac/**`** (gated by `dorny/paths-filter` in `.github/workflows/_deploy.yml`).
- The **dotenv** job runs on every pipeline for the env (main / release branch / release tag) and reads existing Terragrunt outputs.
- **build/deploy backend** and **build/deploy frontend** jobs **need** the `build.env` artifact from the **dotenv** job. If no infra has been applied yet, the first run may fail until **infra** + **dotenv** have succeeded once.

Stage order: **infra** → **dotenv** → **build-backend** → **deploy-backend** → **build-frontend** → **deploy-frontend**.

---

## Local development

### Backend

- Node ≥ 20, pnpm.  
- Copy `backend/.env.example` to `backend/.env` and set DB and optional AWS/Cognito vars.  
- Start Postgres (e.g. `docker compose -f backend/docker-compose.yml up -d postgres`).  
- Run migrations: `pnpm run db:migrate:up`.  
- Start app: `pnpm run start:dev`.  
- GraphQL: [http://localhost:3000/api/v1](http://localhost:3000/api/v1).  
- See [backend/README.md](backend/README.md) for full commands and structure.

### Frontend

- Node (version per `frontend/.nvmrc`), npm or pnpm.  
- Copy `frontend/.env.example` to `frontend/.env` and set `VITE_*` (and API URL, Cognito, etc.).  
- Install and run: `npm install` (or pnpm), `npm run dev`.  
- See [frontend/README.md](frontend/README.md) for scripts and conventions.

### Iaac (optional local Terragrunt)

- Set env: `G_APPLICATION_ID`, `G_AWS_PROFILE_SHARED`, `G_AWS_REGION_DEFAULT` (and `AWS_PROFILE` if needed).  
- From repo root: `cd iaac/terragrunt/dev/eu-central-1/<module>` then `terragrunt plan` / `terragrunt apply`.  
- See [iaac/docs/README.md](iaac/docs/README.md) and [iaac/docs/QUICKSTART.md](iaac/docs/QUICKSTART.md).

---

## Troubleshooting

- **Backend/frontend jobs fail with missing env**: ensure the **dotenv** job ran and passed (and that **infra** for that env has run at least once so Terragrunt outputs exist).  
- **infra job never runs**: push a change under `iaac/`; the infra job only runs when `iaac/**` changes.  
- **AWS/SSH errors in iaac**: check [iaac/docs/GITHUB_SECRETS.md](iaac/docs/GITHUB_SECRETS.md) and that `AWS_PROFILE` / `G_AWS_PROFILE_SHARED` match and credentials are for the bootstrap IAM user.  
- **State / lock issues**: see [iaac/docs/README.md](iaac/docs/README.md) (e.g. `terragrunt force-unlock`).

---

## More detail

- **CI/CD pipeline**: [.github/workflows/](.github/workflows/)  
- **IaC**: [iaac/docs/README.md](iaac/docs/README.md), [iaac/docs/QUICKSTART.md](iaac/docs/QUICKSTART.md), [iaac/docs/GITHUB_SECRETS.md](iaac/docs/GITHUB_SECRETS.md)  
- **Backend**: [backend/README.md](backend/README.md)  
- **Frontend**: [frontend/README.md](frontend/README.md)
