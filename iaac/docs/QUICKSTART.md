# Quick Start Guide - Infrastructure Setup

This guide will help you set up the infrastructure and CI/CD pipeline in under 15 minutes.

## 📋 Prerequisites Checklist

- [ ] AWS CLI installed (`aws --version`)
- [ ] jq installed (`jq --version`)
- [ ] AWS credentials configured with admin access
- [ ] GitHub repository access
- [ ] GitHub Actions runner available with Docker executor

## 🚀 Quick Setup (5 Steps)

### Step 1: Configure Application Settings

Edit `iaac/root.hcl` and replace placeholder values:

```hcl
locals {
  application_id = "my-app"              # Change this
  root_region = "us-east-1"              # Your root region
  aws_root_profile = "default"           # Your AWS profile
  tf_state_default_region = "eu-central-1"  # State bucket region
}
```

### Step 2: Run Bootstrap Script

```bash
cd iaac

# Option A: Use default values from root.hcl
./scripts/bootstrap.sh

# Option B: Override with environment variables
export APPLICATION_ID="my-app"
export AWS_REGION="eu-central-1"
export AWS_PROFILE="default"
./scripts/bootstrap.sh
```

**Expected Output:**
```
[INFO] Creating S3 bucket: my-app-123456789012-tfstates
[INFO] Creating DynamoDB table: my-app-lock
[INFO] Creating IAM user: gitlab-ci-terraform
==========================================
AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
==========================================
[INFO] Credentials saved to: gitlab-ci-credentials-20260214-120000.txt
```

⚠️ **IMPORTANT**: Save the credentials file securely! You'll need it in Step 3.

### Step 3: Configure GitHub Actions secrets

1. Go to your GitHub repository
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Add these variables (click "Add variable" for each):

| Variable Name | Value | Type | Masked | Protected |
|---------------|-------|------|--------|-----------|
| `AWS_ACCESS_KEY_ID` | From bootstrap output | Variable | ✓ Yes | ✓ Yes |
| `AWS_SECRET_ACCESS_KEY` | From bootstrap output | Variable | ✓ Yes | ✓ Yes |
| `AWS_DEFAULT_REGION` | `eu-central-1` | Variable | ✗ No | ✓ Yes |

### Step 4: Update Environment Configurations

Edit environment files with your AWS profile names:

**`iaac/dev/environment.hcl`:**
```hcl
locals {
  environment = "dev"
  aws_profile = "default"  # Change if using named profile
}
```

**`iaac/shared/environment.hcl`:**
```hcl
locals {
  environment = "shared"
  aws_profile = "default"  # Change if using named profile
}
```

### Step 5: Test Locally (Optional but Recommended)

```bash
cd iaac/dev/eu-central-1/vpc

# Initialize
terragrunt init

# Check what will be created
terragrunt plan

# If plan looks good, apply one module
terragrunt apply
```

## 🎯 First Pipeline Run

### Push to GitHub

```bash
git add .github/workflows/ iaac/
git commit -m "Add Terragrunt CI/CD pipeline"
git push origin main
```

### Monitor pipeline

1. Go to: **CI/CD → Pipelines**
2. Push a change under `iaac/` (e.g. to `main`). The pipeline runs:
   - **infra**: `deploy-dev` runs only when `iaac/**/*` changed (Terragrunt apply, no separate plan stage).
   - **dotenv**: `generate-dotenv-dev` runs and produces the dotenv report for backend/frontend.
   - Later stages build and deploy backend and frontend.

There is no manual “Apply” button; **deploy-dev** (or deploy-staging/production) runs automatically when the branch/tag and path rules match.

## 🔍 Verify Setup

### Check S3 Bucket
```bash
aws s3 ls | grep tfstates
```

### Check DynamoDB Table
```bash
aws dynamodb list-tables | grep lock
```

### Check IAM User
```bash
aws iam get-user --user-name gitlab-ci-terraform
```

### Test AWS Access from GitHub Actions
```bash
# Add a test job to .github/workflows/ temporarily
test-aws:
  image: amazon/aws-cli
  script:
    - aws sts get-caller-identity
    - aws s3 ls
  only:
    - main
```

## 🐛 Common Issues and Fixes

### Issue 1: "Bucket name already exists"
**Cause**: S3 bucket names are globally unique  
**Fix**: Change `application_id` in `iaac/root.hcl` to something unique

### Issue 2: "Access Denied" in GitHub Actions pipeline
**Cause**: AWS credentials not set correctly  
**Fix**: 
- Verify secrets in GitHub Settings → Secrets and variables → Actions
- Ensure variables are not expired
- Check IAM policy is attached: `aws iam list-attached-user-policies --user-name gitlab-ci-terraform`

### Issue 3: "No such file or directory: providers.tf"
**Cause**: Terragrunt hasn't generated files yet  
**Fix**: Run `terragrunt init` first

### Issue 4: Bootstrap script fails with "jq: command not found"
**Fix**: 
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Amazon Linux
sudo yum install jq
```

### Issue 5: State lock timeout
**Cause**: Previous run didn't complete  
**Fix**:
```bash
# Find the lock ID from error message
terragrunt force-unlock <LOCK_ID>
```

## 📊 Understanding the pipeline

### Pipeline flow (infra + dotenv)
```
Push to main (with changes under iaac/)
    ↓
infra: deploy-dev runs (Terragrunt apply)
    ↓
dotenv: generate-dotenv-dev runs (writes build.env for backend/frontend)
    ↓
build-backend / deploy-backend, build-frontend / deploy-frontend (if applicable)
```

**Infra (deploy-dev):**
- Runs only when `iaac/**/*` has changes on `main`
- Runs Terragrunt apply (no separate validate/plan stage in this pipeline)
- See root [SETUP.md](../../SETUP.md) and [.github/workflows/](../../.github/workflows/) for full stage list

## 🎓 Next Steps

After setup is complete:

1. **Review Infrastructure**: Check AWS Console for created resources
2. **Add More Modules**: Create new Terragrunt modules in `iaac/dev/`
3. **Set Up Monitoring**: Configure CloudWatch alarms
4. **Document Changes**: Update README with custom configurations
5. **Team Training**: Share this guide with team members

## 📞 Getting Help

- **Pipeline failing?** Check the job logs in GitHub Actions
- **Terraform errors?** Run `terragrunt plan` locally to debug
- **AWS permissions?** Verify IAM policy and credentials
- **State issues?** Check S3 bucket and DynamoDB table exist

## ✅ Success checklist

- [ ] Bootstrap script completed successfully
- [ ] All required secrets added to GitHub (see [GITHUB_SECRETS.md](GITHUB_SECRETS.md))
- [ ] Push a change under `iaac/` to `main` and confirm `deploy-dev` runs
- [ ] `generate-dotenv-dev` runs and backend/frontend jobs receive dotenv
- [ ] Resources visible in AWS Console

## 🎉 You're done

The pipeline will run **deploy-dev** (or deploy-staging/production) whenever there are changes under `iaac/` on the matching branch or tag. Keep credentials secure and rotate regularly (see [rotate-credentials.sh](../rotate-credentials.sh)).
