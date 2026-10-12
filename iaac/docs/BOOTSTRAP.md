# Bootstrap procedure

> **Note (credentials):** the IAM-user/static-access-key setup this document teaches is the **legacy bootstrap path** (first-time account wiring + CI keys). Day-to-day human authentication is the **IAM Identity Center access portal** + `aws sso login --profile <p>` against named profiles. Agents never create credentials at all — they follow [.agentic/rules/iaac/aws-credentials.md](../../.agentic/rules/iaac/aws-credentials.md) (named profiles only, never long-lived keys).

**Audience:** DevOps engineer performing first-time setup of the monorepo.

This document describes the full bootstrap flow: from obtaining the repository through initializing Git, running the bootstrap script, uploading GitHub Actions secrets (via the GitHub CLI), adding the gsnake-modules deploy key (on GitHub), and resetting Git history so the new project starts from a single initial commit. **Do not push to the remote until the procedure is complete.**

---

## Prerequisites

- **Tools:** `git`, `tar`, `make`. For the bootstrap script: `aws`, `jq`, `curl`, `gh` (authenticated via `gh auth login`), `ssh-keygen` (see [README.md](../README.md)).
- **AWS:** CLI installed and configured; one or more AWS accounts with profiles (shared + dev/staging/production). IAM user with sufficient rights for bootstrap (S3, IAM, EC2 key pairs).
- **GitHub:** Admin access to the monorepo repository (so `gh` can set Actions secrets, repository + environment) and to `geniusee-software/gsnake-modules` (to add the deploy key).

For more detail on infrastructure prerequisites, see [iaac/docs/QUICKSTART.md](../iaac/docs/QUICKSTART.md) and [iaac/docs/CHECKLIST.md](../iaac/docs/CHECKLIST.md).

---

## Step 1: Get the repository

You can either download an archive (no Git history at all) or clone the template — the bootstrap script resets the inherited history to a single initial commit either way (see [Step 8](#step-8-clean-git-history)).

1. Download the repo as a **tar.gz** archive (e.g. from the source repository: Project/Repo → **Download / Code** → choose branch, e.g. `main`).
2. Create a folder with the name of your project (e.g. `demo-monorepo`).
3. Unarchive so the repo root is inside that folder. If the archive is named `monorepo-main.tar.gz` and contains a top-level directory `monorepo-main/`:

   ```bash
   tar -xvzf monorepo-main.tar.gz -C demo-monorepo --strip-components=1
   ```

   If the archive or top-level directory name differs (e.g. `monorepo-master.tar.gz` or no top-level folder), adjust the archive name and `--strip-components` so that the repository root (e.g. `Makefile`, `iaac/`, `backend/`) is directly inside the target folder.

---

## Step 2: Initialize Git (do not push yet)

1. Change into the project folder:

   ```bash
   cd demo-monorepo
   ```

2. Initialize Git with `main` as the initial branch:

   ```bash
   git init --initial-branch=main
   ```

   The initial commit is created for you at the end of bootstrap (Step 8) — you do not need to commit by hand.

3. On GitHub, create a **new empty repository** (no README, no initial commit).
4. Add that empty GitHub repo as the remote:

   ```bash
   git remote add origin <github-repo-url>
   ```

   Example: `https://github.com/acme/my-app.git` or `git@github.com:acme/my-app.git`.

   > **If you cloned the template**, repoint `origin` at your own repository instead:
   >
   > ```bash
   > git remote set-url origin <github-repo-url>
   > ```
   >
   > While `origin` still points at the template repo, bootstrap refuses to touch Git history (it would rewrite the original) **and** would upload your Actions secrets to the template repository.

**Do not push to the remote yet.** Push only after the bootstrap procedure is complete (Step 9).

---

## Step 3: Run bootstrap

From the repository root, run:

```bash
make
```

This runs the default Make goal, which invokes [iaac/scripts/bootstrap.sh](../iaac/scripts/bootstrap.sh) (see [Makefile](../Makefile)).

---

## Step 4: Bootstrap script prompts

The script will prompt for the following. Have your AWS profile names and GitHub repository (owner/repo) ready.

| Prompt | Description | Example / notes |
|--------|-------------|-----------------|
| **Application ID** | Prefix for all infrastructure resources (S3 bucket, IAM user, ECR, key names). | e.g. `my-app`, `enverse` |
| **AWS SHARED profile** | AWS CLI profile for the shared/root account (used for Terraform state bucket and IAM user). | e.g. `default`, `my-org-shared` |
| **AWS dev profile** | Profile for the dev account. Multi-account: use dev profile; single-account: same as shared. | e.g. `dev`, or same as shared |
| **AWS stage profile** | Profile for the staging account. Single-account: reuse the same profile. | e.g. `stage` |
| **AWS prod profile** | Profile for the production account. Single-account: reuse the same profile. | e.g. `prod` |
| **AWS region** | Region for state bucket, EC2 key pair, and default Terragrunt operations. | e.g. `eu-central-1` |
| **IAM username for CI** | IAM user used by the IAAC pipeline deployer (created in the shared account). | Default: `gitlab-ci-terraform` (kept as-is; referenced by IAM trust policies) |

The script also asks **which environments to set up** (dev, staging, production). Answer `yes` or `no` for each; only selected envs get IAM roles and GitHub environment secrets.

After you confirm the summary, the script creates AWS resources, uploads GitHub Actions secrets via `gh` (Step 6), and adds the gsnake-modules deploy key via `gh` (Step 7).

---

## Step 5: What the script creates

When the script runs successfully (before the GitHub integration steps), it creates:

- **S3 bucket** for Terraform state: `{application_id}-{account_id}-tfstates`, with versioning and encryption.
- **IAM user** (in the shared account) with a static access key; credentials are printed once and saved under `iaac/.keys/`.
- **EC2 key pair** (ed25519): private key in `iaac/.keys/{application_id}`, public key `iaac/.keys/{application_id}.pub`; key name in AWS = application_id.
- **Per-environment IAM roles** (only for envs you selected): e.g. `{application_id}-dev-deploy`, `{application_id}-staging-deploy`, `{application_id}-production-deploy` in the corresponding AWS accounts.
- **Credentials file** under `iaac/.keys/gitlab-ci-credentials-*.txt` (one-time secret; keep secure).
- **Per-environment `environment.hcl`** under `iaac/terragrunt/<env>/` (e.g. `iaac/terragrunt/dev/environment.hcl`) using `get_env("G_AWS_PROFILE")` for dynamic profile resolution.
- **Per-environment `mise.toml`** under `iaac/terragrunt/<env>/` with the default AWS profile for local development (e.g. `G_AWS_PROFILE` defaults to the profile name you specified during bootstrap).
- **A clean Git history**: one initial commit on `main`, with the template's history moved aside as a backup (Step 8).

---

## Step 6: GitHub Actions secrets (via gh)

The monorepo CI runs on GitHub Actions, so secrets are uploaded with the **GitHub CLI** — no token prompt here.

1. Authenticate **before** running bootstrap (a prerequisite check enforces this):

   ```bash
   gh auth login
   ```

2. The script auto-detects the `origin` GitHub remote (added in Step 2) and uploads secrets to that repository.

The script creates or updates GitHub Actions secrets: repository-level (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_PROFILE`, `G_APPLICATION_ID`, `G_AWS_PROFILE_SHARED`, `G_AWS_REGION_DEFAULT`, `SSH_PRIVATE_KEY`) and per-environment (`ENV_AWS_ROLE_ARN`, `G_AWS_PROFILE` for each selected env). Full list and behavior are in [iaac/docs/GITHUB_SECRETS.md](../iaac/docs/GITHUB_SECRETS.md).

---

## Step 7: Deploy key for gsnake-modules (GitHub)

The private Terraform modules repo (`geniusee-software/gsnake-modules`) is on **GitHub**. The bootstrap script adds the SSH public key as a read-only deploy key via the GitHub CLI (`gh repo deploy-key add`), so the IAAC pipeline can clone modules from `git@github.com:geniusee-software/gsnake-modules.git`. Requires that your `gh` login has admin access to that repository.

1. Press Enter at the prompt to add the key automatically (or type `skip` to add it manually).

If skipped or `gh` lacks admin access, add the key manually:

1. Get the public key from `iaac/.keys/<application_id>.pub`.
2. Open **https://github.com/geniusee-software/gsnake-modules/settings/keys** → **Add deploy key**.
3. Paste the key with title `<application_id>-monorepo`.

---

## Step 8: Clean Git history

As its last step, bootstrap replaces the template's Git history so the new project starts from a single initial commit:

1. It asks for confirmation, showing how many commits will be replaced (`yes` is the default).
2. The existing `.git` is **moved**, not deleted, to `.git-history-backup-<timestamp>/` in the repo root (added to `.gitignore`). Delete it once the first push looks good: `rm -rf .git-history-backup-*`.
3. Git is re-initialized on `main`, all remotes are restored, and everything is committed as `chore: initial commit`. Files under `iaac/.keys/`, `*.pem` and `gitlab-ci-credentials-*.txt` are kept out of that commit even if `.gitignore` does not cover them.

**The original g-monorepo is never rewritten.** The step is skipped, with history left untouched, when:

| Condition | Why |
|-----------|-----|
| `origin` points at the template repo (`geniusee-software/monorepo`, `geniusee-software/g-monorepo`) | This checkout *is* the original — repoint `origin` at your project repo and re-run |
| `--keep-history` or `BOOTSTRAP_KEEP_HISTORY=1` | Explicit opt-out |
| `--check` mode | Read-only run |
| The repo is a submodule/worktree, or nested inside another repo | Not safe to re-init |
| `user.name` / `user.email` are unset | Nothing is moved; configure Git identity and re-run |
| History is already a single commit | Nothing to do |

Overrides: `TEMPLATE_REPO_SLUGS` (space-separated `owner/repo` list treated as the original), `BOOTSTRAP_INITIAL_BRANCH` (default `main`), `BOOTSTRAP_INITIAL_COMMIT_MESSAGE` (default `chore: initial commit`).

---

## Step 9: Ready for initial push

At this point:

- The repo has a clean history: one initial commit on `main`, with the GitHub remote set.
- You have **not** pushed yet.
- Bootstrap has created AWS resources, GitHub Actions secrets, and you have added the gsnake-modules deploy key.

When you are ready, push to the remote:

```bash
git push -u origin main
```

On the first push to `main`, the `deploy-dev` workflow runs (the `infra` job only when `iaac/**` changes, then `dotenv`, then the backend/frontend build & deploy jobs). For pipeline behavior and setup order, see [SETUP.md](../SETUP.md) and [.github/workflows/](../.github/workflows/).

---

## Known issues

The following GitHub Actions secrets are **not** yet set by the bootstrap script. Add them manually in **Settings → Secrets and variables → Actions** if your pipeline or integrations require them:

- `RENOVATE_TOKEN`
- `SLACK_WEBHOOK_URL`
- `SONAR_HOST_URL`
- `SONAR_TOKEN`

These are planned to be added in a future update. For the full list of variables used by the pipeline, see [iaac/docs/GITHUB_SECRETS.md](../iaac/docs/GITHUB_SECRETS.md).
