---
name: iaac-aws-resources
description: AWS resource conventions — VPC, RDS, Cognito, Lambda, S3, CloudFront, IAM authoring
globs: ["iaac/**/*.hcl", "iaac/**/*.tf"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# AWS Resource Conventions

Concrete values below are illustrations tagged *(THIS repo)* — when in doubt, derive the real convention from `root.hcl` / `environment.hcl`, don't copy these as universal truths. Hard safety rules at the bottom ARE blanket rules.

## VPC

- One VPC per environment per region *(THIS repo)*
- CIDR ranges don't overlap across environments (so VPC peering remains an option)
- Public subnets for ALB / NAT / jumpbox only; private subnets for Lambda, RDS, internal services
- Database subnets isolated (no internet route)
- NAT cost/blast-radius heuristic: WHEN the env is dev/low-stakes → one shared NAT gateway is fine; WHEN prod → per-AZ NAT. The signal is the blast radius of an AZ outage vs the recurring per-gateway cost.

## RDS Aurora (Postgres)

- Engine version pinned (e.g. `aurora-postgresql 15.4` — THIS repo)
- Instance class declared per env — WHEN a value diverges across envs, that's the signal to parameterize it (dev cheaper, prod beefier)
- Automated backups: retention ≥7 days dev, ≥30 days prod *(THIS repo's baseline — tune to the data's recovery requirement)*
- Encryption at rest: **always on** — `storage_encrypted = true`
- Performance Insights: on in prod *(THIS repo)*; the signal elsewhere is whether anyone will look at it
- Master credentials → Secrets Manager (never in TF state)
- Connection security group restricts ingress to Lambda + jumpbox SG only
- **Stateful**: a plan that replaces or deletes the cluster is an escalate-grade finding even at exit 0 — see [terragrunt.md](./terragrunt.md) §Reading a plan

## Cognito

- One user pool per environment *(THIS repo)*
- Custom domain configured per env (e.g. `auth.dev.example.com`)
- App clients separated for backend (server-side) vs frontend/mobile (public, PKCE)
- MFA: optional in dev, required in production *(THIS repo)* — the signal is the env's real-user exposure
- Lambda triggers (pre-token, post-confirmation) configured via `lambda_config`
- User pool ID + client IDs exposed as outputs, consumed by backend/frontend env vars
- **Stateful**: user pool replacement = every user and password lost; escalate-grade in any plan — see [terragrunt.md](./terragrunt.md) §Reading a plan

## API Gateway

- WHEN the API is Lambda-proxy + JWT auth → HTTP API (v2): cheaper, faster cold starts. WHEN you need usage plans / API keys / request validation → REST (v1) is the legitimate reason to diverge. *(THIS repo: all APIs are HTTP v2)*
- Custom domain per env
- Lambda integration uses `proxy` for single-Lambda apps
- Throttling: e.g. *(THIS repo)* 10000 burst / 5000 rate — the signal to tune is observed traffic + the cost of a runaway client, not these numbers
- Access logging to CloudWatch Logs

## Lambda

- Packaging: WHEN deps exceed zip limits or CI already builds images → container images via ECR; zip is fine for small, dependency-light functions. *(THIS repo: container images — CI builds them anyway)*
- Architecture: WHEN no x86-only native deps → `arm64` (cheaper, often faster, fewer cold starts); the signal to stay on x86 is a binary dependency without arm64 builds. *(THIS repo: arm64)*
- Memory: start around 1024MB *(THIS repo default)*; the resize signal is profiled duration vs cost — memory also scales CPU
- Reserved concurrency on critical functions to prevent runaway scaling; provisioned concurrency only WHEN cold-start latency is a measured problem on a latency-critical endpoint (it bills continuously)
- VPC config required for RDS access; uses NAT for outbound internet
- Logs: structured JSON; retention e.g. 14 days dev / 90 days prod *(THIS repo)* — the signal is audit/debug needs vs storage cost
- Environment variables: only non-secret config (region, table names); secrets fetched at runtime from Secrets Manager

## S3

- All buckets `block_public_access = true` by default
- Bucket policies explicit — no `s3:GetObject` on `*` principal except for CloudFront origins
- Encryption: SSE-S3 minimum; WHEN data is sensitive or needs key-level audit → SSE-KMS
- Versioning enabled on stateful buckets (terraform state, app data) — those buckets are escalate-grade on deletion in a plan
- Lifecycle rules: delete incomplete multipart uploads after 7 days; transition old versions to IA/Glacier where applicable
- Frontend bucket: paired with CloudFront, accessed via OAC (Origin Access Control) — never a public website endpoint

## CloudFront

- HTTPS-only (`viewer_protocol_policy = "redirect-to-https"`), TLS 1.2 minimum
- Custom domain via ACM cert in **us-east-1** (CloudFront-specific AWS requirement, not a style choice)
- Compression enabled
- Cache invalidation triggered by CI on frontend deploy

## Security groups

- One SG per logical role: `lambda-sg`, `rds-sg`, `jumpbox-sg`, `alb-sg` *(THIS repo naming)*
- Rules reference SG IDs, **never `0.0.0.0/0`** for non-public services
- Egress on `lambda-sg` allowed to `rds-sg:5432` and `0.0.0.0/0:443` (for AWS SDK calls) *(THIS repo)*
- Ingress on `rds-sg` allowed from `lambda-sg:5432` and `jumpbox-sg:5432` only *(THIS repo)*

## Secrets Manager

- One secret per logical concern (database creds, Cognito client secret, third-party API keys)
- Secret names: `<env>/<project>/<purpose>` (e.g. `dev/monorepo/db/master`) *(THIS repo scheme)*
- Rotation enabled where supported (RDS native rotation)
- Lambda fetches via SDK — never hardcoded in env vars

## ECR

- One repo per Lambda function (or per service if grouped) *(THIS repo)*
- Image scanning on push enabled
- Lifecycle rule: e.g. keep last 10 tagged images, delete untagged after 7 days *(THIS repo)*
- Repo policies grant pull access to Lambda execution roles only

## IAM policies — authoring-time least privilege

(security-verifier flags `Action: "*"` at review time; this section prevents writing it in the first place.)

- WHEN the resource ARN is derivable at authoring time (the name comes from env/project locals) → scope the statement to that ARN or prefix — the signal is whether the naming convention pins the ARN prefix.
- WHEN the resource set is genuinely dynamic → constrain by tag or path condition (e.g. `aws:ResourceTag/Environment`) instead of widening to `*`.
- `iam:PassRole` always names the role it passes — a wildcard PassRole is privilege escalation.
- Prefer one role per workload (execution role per Lambda/service); the signal for sharing a role is genuinely identical permission sets, not convenience.
- `Action: "*"` on `Resource: "*"` is never the answer.
- WHEN a policy diff in review only ADDS actions, ask which acceptance criterion needs each one.

## Tags

Tagging is enforced centrally *(THIS repo)*: `root.hcl`'s generated providers apply `default_tags` of **`Application` + `Environment`** to every resource. Don't re-declare those per resource; add purpose-specific tags at resource level only WHEN a resource needs more (cost allocation, discovery). Rolling this rule into another repo? Read its provider `default_tags` first — the tag set is repo policy, not a universal list.

WHEN a unit overrides the env/tenant slug in its `inputs` while still inheriting provider `default_tags` from `environment.hcl` → names and tags now disagree (resources *named* for one env, *tagged* for another — cost reports and discovery both lie). Either flow the override into the tags too, or declare a separate `Tenant` tag. The grep-able signal: `environment =` inside a unit's `inputs` while an `environment.hcl` include exists.

## Hard rules

- ❌ `0.0.0.0/0` ingress on non-public SGs
- ❌ Plaintext secrets in TF state, environment.hcl, or terragrunt.hcl
- ❌ `block_public_access = false` without a documented reason in a code comment
- ❌ Lambda without VPC config when it needs DB access
- ❌ Lambda env vars containing secrets
- ❌ `Action: "*"` on `Resource: "*"` in any IAM policy
- ❌ Resources that bypass the provider `default_tags` left untagged
- ❌ ACM certs for CloudFront created outside us-east-1
