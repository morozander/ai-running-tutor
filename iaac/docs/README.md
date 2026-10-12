# Infrastructure as Code - Terragrunt Setup

This directory contains Terragrunt configurations for managing AWS infrastructure across multiple environments.

## 📁 Directory Structure

```
iaac/
├── root.hcl                 # Root configuration with remote state and provider settings
├── scripts/
│   └── bootstrap.sh         # Bootstrap script to set up AWS resources and IAM user
├── dev/                     # Development environment
│   ├── environment.hcl      # Dev-specific variables
│   └── eu-central-1/        # Region-specific resources
│       ├── region.hcl
│       ├── vpc/
│       ├── s3/
│       ├── rds-aurora/
│       ├── cognito/
│       ├── apigw/
│       ├── security-groups/
│       ├── secrets-manager/
│       └── jumpbox/
└── shared/                  # Shared resources across environments
    ├── environment.hcl
    └── eu-central-1/
        ├── region.hcl
        ├── ecr/
        ├── ci-oidc-role/
        └── g-opportunity/
```

## 🚀 Getting Started

### Prerequisites

- AWS CLI installed and configured
- Terragrunt >= 0.55.1
- Terraform >= 1.7.3
- jq (for bootstrap script)
- Access to AWS account with appropriate permissions

### Initial Setup

#### 1. Bootstrap AWS Infrastructure

Before running Terragrunt, you need to create the S3 bucket for state storage, DynamoDB table for locking, and IAM user for CI.

```bash
cd iaac

# Set environment variables (or update values in scripts/bootstrap.sh)
export APPLICATION_ID="your-app-id"
export AWS_REGION="eu-central-1"
export AWS_PROFILE="your-aws-profile"

# Make script executable
chmod +x scripts/bootstrap.sh

# Run bootstrap
./scripts/bootstrap.sh
```

The bootstrap script will:
- Create S3 bucket: `{application-id}-{account-id}-tfstates`
- Enable versioning and encryption on S3 bucket
- Create DynamoDB table: `{application-id}-lock`
- Create IAM user: `gitlab-ci-terraform`
- Create IAM policy with near-AdministratorAccess (excluding IAM user management)
- Generate access keys for CI

**Important:** Save the AWS credentials output from the bootstrap script! You'll need them for GitHub Actions secrets. To **rotate keys** periodically (e.g. every 90 days), run `./rotate-credentials.sh` from the `iaac/` directory and update the two AWS keys in GitHub; see [GITHUB_SECRETS.md](GITHUB_SECRETS.md).

#### Re-run and verify

The bootstrap script is **re-runnable**: it skips creating resources that already exist and updates GitHub secrets and mise.toml.

- **Check only (no creates):** `./scripts/bootstrap.sh --check` — validates AWS access and reports which resources exist (S3 bucket, EC2 key pair, IAM user, per-env roles). Use this to verify a previous run.
- **Full re-run:** `./scripts/bootstrap.sh` — same prompts; creates only what’s missing; refreshes GitHub secrets and per-env mise.toml. If the IAM user already has 2 access keys (AWS limit), no new key is created and GitHub credentials are not updated; other variables (e.g. `ENV_AWS_ROLE_ARN`, `G_AWS_PROFILE`) are still updated.

#### 2. Update Configuration Files

Update `iaac/root.hcl` with your values:

```hcl
locals {
  application_id = "your-app-id"
  root_region = "us-east-1"
  aws_root_profile = "your-aws-profile"
  tf_state_default_region = "eu-central-1"
}
```

Update environment-specific files:
- `iaac/dev/environment.hcl`
- `iaac/shared/environment.hcl`

#### 3. Configure GitHub Actions

Add the following secrets in GitHub:
**Settings → Secrets and variables → Actions**

| Variable | Value | Masked | Protected |
|----------|-------|--------|-----------|
| `AWS_ACCESS_KEY_ID` | From bootstrap output | ✓ | ✓ |
| `AWS_SECRET_ACCESS_KEY` | From bootstrap output | ✓ | ✓ |
| `AWS_DEFAULT_REGION` | `eu-central-1` | ✗ | ✓ |

## 🔧 Local Development

### Running Terragrunt Locally

```bash
cd iaac/dev/eu-central-1/vpc

# Initialize
terragrunt init

# Plan changes
terragrunt plan

# Apply changes
terragrunt apply
```

### Security (Checkov)

[Checkov](https://www.checkov.io/) runs static analysis on Terraform/HCL in `iaac/` for security and compliance.

- **Pre-commit:** If you use pre-commit (`pre-commit install`), the Checkov hook runs when files under `iaac/` change.
- **Locally:** `make checkov` from the repo root (requires `pip install checkov`), or `checkov -d iaac/ --framework terraform`.
- **CI:** The `checkov` job runs in the `validate` stage when `iaac/**` changes (merge requests and main/release/tag pipelines). It uses `--soft-fail` so the pipeline does not fail on findings; fix or suppress checks as needed.

```bash
# Destroy resources
terragrunt destroy
```

### Working with Multiple Modules

```bash
cd iaac/dev

# Plan all modules
terragrunt run-all plan

# Apply all modules
terragrunt run-all apply

# Validate all configurations
terragrunt run-all validate
```

## 🔄 GitHub Actions pipeline (infrastructure part)

The monorepo pipeline includes an **infra** stage and a **dotenv** stage that use this IaC:

### Infra stage (deploy-*)

- **Jobs**: `deploy-dev`, `deploy-staging`, `deploy-production`
- **When**: Run only when there are **changes under `iaac/**/*`** (and branch/tag matches). No separate validate or plan stage; Terragrunt apply runs directly via `.github/scripts/iaac_apply.sh`.
- **Branch/tag**: dev = `main`, staging = `release/*`, production = tag `release/*`.

### Dotenv stage (generate-dotenv-*)

- **Jobs**: `generate-dotenv-dev`, `generate-dotenv-staging`, `generate-dotenv-production`
- **When**: On every push to the matching branch/tag (same as above). They need the matching deploy-* job (optional) and produce the `build.env` dotenv report consumed by backend and frontend jobs.

### Flow

1. Push changes under `iaac/` to `main` (or `release/*` / tag for staging/production).
2. If `iaac/**/*` changed, the matching **deploy-dev** / **deploy-staging** / **deploy-production** runs (Terragrunt apply).
3. **generate-dotenv-*** for that env runs and writes Terragrunt outputs into the pipeline dotenv report.
4. Backend and frontend build/deploy jobs in later stages use that report (ECR URL, Lambda names, S3 bucket, CloudFront ID, etc.).

For full pipeline stages and job names, see the root [SETUP.md](../../SETUP.md) and [.github/workflows/](../../.github/workflows/).

## 🏗️ Infrastructure Components

### Dev Environment

- **VPC**: Network infrastructure with public, private, and database subnets
- **RDS Aurora**: PostgreSQL database cluster
- **S3**: Storage buckets
- **Cognito**: User authentication
- **API Gateway**: HTTP API gateway
- **Security Groups**: Network security rules
- **Secrets Manager**: Secret storage
- **Jumpbox**: EC2 instance for SSH access

### Shared Environment

- **ECR**: Container registry
- **CI/CD Roles**: IAM roles for CI/CD pipelines
- **G-Opportunity**: Shared application resources

## 🔐 Security Best Practices

### IAM User Permissions

The CI IAM user has near-AdministratorAccess with the following restrictions:
- ✅ Can create/manage IAM roles and policies
- ✅ Can create any AWS infrastructure
- ❌ Cannot create/delete IAM users
- ❌ Cannot modify IAM user access keys
- ❌ Cannot leave organization or close account

This follows the principle of least privilege while allowing infrastructure automation.

### State Management

- **S3 Backend**: Terraform state stored in encrypted S3 bucket
- **State Locking**: DynamoDB table prevents concurrent modifications
- **Versioning**: S3 versioning enabled for state file history
- **Encryption**: AES-256 encryption at rest

## 🐛 Troubleshooting

### Common Issues

#### 1. "Bucket already exists" error
The S3 bucket name must be globally unique. Update `application_id` in `root.hcl`.

#### 2. "Access Denied" errors
Ensure AWS credentials are correctly set in GitHub Actions secrets and IAM policy is attached to the user.

#### 3. "State lock" errors
If a previous run was interrupted, manually release the lock:
```bash
terragrunt force-unlock <lock-id>
```

#### 4. deploy-* job not created
If **deploy-dev** (or staging/production) does not appear in the pipeline, ensure you have pushed changes under `iaac/` (e.g. `iaac/**/*`). Those jobs run only when such changes are detected.

### Debug Mode

Enable debug output:
```bash
export TF_LOG=DEBUG
export TERRAGRUNT_DEBUG=1
terragrunt plan
```

## 📚 Additional Resources

- [Terragrunt Documentation](https://terragrunt.gruntwork.io/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS CLI Reference](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/index.html)

## 🔄 Migration from Existing Infrastructure

If you have existing infrastructure:

1. Import existing resources:
```bash
terragrunt import aws_vpc.main vpc-xxxxx
```

2. Generate Terraform configuration from existing resources:
```bash
terragrunt state pull > existing-state.json
```

3. Use `terraform import` or tools like `terraformer` for bulk imports.

## 📝 Contributing

When making infrastructure changes:

1. Create a feature branch
2. Make changes to Terragrunt configurations
3. Test locally with `terragrunt plan`
4. Create merge request
5. Merge to main (or push to release branch / create tag). The pipeline runs **deploy-dev** (or the matching env) when `iaac/**/*` has changes.

## 🆘 Support

For issues or questions:
- Check the troubleshooting section above
- Review GitHub Actions job logs
- Contact DevOps team
