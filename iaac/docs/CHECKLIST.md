# Infrastructure Setup Checklist

Use this checklist to ensure all steps are completed before deploying infrastructure.

## 📋 Pre-Bootstrap Checklist

### AWS Account Setup
- [ ] AWS account created and accessible
- [ ] IAM user with AdministratorAccess for bootstrap
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure` or `~/.aws/credentials`)
- [ ] jq installed (`jq --version`)

### Local Environment
- [ ] Terraform installed (>= 1.7.3)
- [ ] Terragrunt installed (>= 0.55.1)
- [ ] Git configured with SSH keys for GitHub
- [ ] Repository cloned locally

## 🔧 Configuration Checklist

### 1. Update root.hcl
- [ ] Replace `<application-id>` with actual app ID (e.g., `my-app`)
- [ ] Replace `<aws-root-profile>` with AWS profile name (e.g., `default`)
- [ ] Replace `<tf-state-default-region>` with region (e.g., `eu-central-1`)
- [ ] Verify `root_region` is correct (default: `us-east-1`)

**File**: `iaac/root.hcl`
```hcl
locals {
  application_id = "my-app"              # ✏️ UPDATE THIS
  root_region = "us-east-1"
  aws_root_profile = "default"           # ✏️ UPDATE THIS
  tf_state_default_region = "eu-central-1"  # ✏️ UPDATE THIS
}
```

### 2. Update Environment Configurations

#### Dev Environment
- [ ] Update AWS profile in `iaac/dev/environment.hcl`

**File**: `iaac/dev/environment.hcl`
```hcl
locals {
  environment = "dev"
  aws_profile = "default"  # ✏️ UPDATE THIS
}
```

#### Shared Environment
- [ ] Update AWS profile in `iaac/shared/environment.hcl`

**File**: `iaac/shared/environment.hcl`
```hcl
locals {
  environment = "shared"
  aws_profile = "default"  # ✏️ UPDATE THIS
}
```

### 3. Update Module-Specific Configurations

#### API Gateway
- [ ] Update domain name in `iaac/dev/eu-central-1/apigw/terragrunt.hcl`
- [ ] Decide if custom domain is needed (`create_domain_name`)

**File**: `iaac/dev/eu-central-1/apigw/terragrunt.hcl`
```hcl
inputs = {
  domain_name = "api.example.com"  # ✏️ UPDATE THIS
  create_domain_name = false       # Set to true if using custom domain
  create_domain_records = false    # Set to true if using Route53
}
```

#### Cognito
- [ ] Update callback URLs in `iaac/dev/eu-central-1/cognito/terragrunt.hcl`
- [ ] Replace `<domain_name>` in callback URLs

**File**: `iaac/dev/eu-central-1/cognito/terragrunt.hcl`
```hcl
callback_urls = [
  "http://localhost:3000/auth/login",
  "http://localhost:3000/callback",
  "https://app.example.com",  # ✏️ UPDATE THIS
]
```

#### Lambda Dependencies (If using Cognito triggers)
- [ ] Create Lambda Terragrunt modules OR
- [ ] Remove Lambda dependencies from Cognito configuration

**Decision Required**: How will Cognito Lambda triggers be deployed?
- Option A: Add to Terragrunt (recommended)
- Option B: Deploy separately and remove dependencies

### 4. VPC Configuration
- [ ] Review VPC CIDR in `iaac/dev/eu-central-1/vpc/terragrunt.hcl`
- [ ] Adjust subnet counts if needed
- [ ] Decide on NAT gateway strategy (single vs. per AZ)

**File**: `iaac/dev/eu-central-1/vpc/terragrunt.hcl`
```hcl
inputs = {
  vpc_cidr = "10.40.0.0/16"  # ✏️ VERIFY THIS
  private_subnets_n = 2
  public_subnets_n = 2
  database_subnets_n = 2
  single_nat_gateway = true  # false for HA (higher cost)
}
```

## 🚀 Bootstrap Checklist

### Run Bootstrap Script
- [ ] Navigate to `iaac/` directory
- [ ] Review `scripts/bootstrap.sh` script
- [ ] Set environment variables (optional)
- [ ] Run `./scripts/bootstrap.sh`
- [ ] **SAVE** the credentials output to secure location
- [ ] Verify S3 bucket created
- [ ] Verify DynamoDB table created
- [ ] Verify IAM user created

### Bootstrap Commands
```bash
cd iaac

# Option 1: Use defaults from root.hcl
./scripts/bootstrap.sh

# Option 2: Override with environment variables
export APPLICATION_ID="my-app"
export AWS_REGION="eu-central-1"
export AWS_PROFILE="default"
./scripts/bootstrap.sh
```

### Verify Bootstrap
```bash
# Check S3 bucket
aws s3 ls | grep tfstates

# Check DynamoDB table
aws dynamodb describe-table --table-name my-app-lock

# Check IAM user
aws iam get-user --user-name gitlab-ci-terraform

# Check IAM policy attached
aws iam list-attached-user-policies --user-name gitlab-ci-terraform
```

## 🔐 GitHub Actions Checklist

### Configure GitHub secrets
- [ ] Go to GitHub: Settings → Secrets and variables → Actions
- [ ] Add all required variables (see [GITHUB_SECRETS.md](GITHUB_SECRETS.md) for the full list: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_PROFILE, G_APPLICATION_ID, G_AWS_PROFILE_SHARED, G_AWS_REGION_DEFAULT, SSH_PRIVATE_KEY)
- [ ] Verify all variables are saved

### GitHub Actions runner Configuration
- [ ] GitHub Actions runner is available
- [ ] Runner has Docker executor
- [ ] Runner can pull `alpine/terragrunt` image
- [ ] Runner has network access to AWS

## 🧪 Local Testing Checklist

### Test Single Module
- [ ] Navigate to a module directory
- [ ] Run `terragrunt init`
- [ ] Run `terragrunt validate`
- [ ] Run `terragrunt plan`
- [ ] Review plan output
- [ ] (Optional) Run `terragrunt apply` for testing

### Test Commands
```bash
# Test VPC module
cd iaac/dev/eu-central-1/vpc
terragrunt init
terragrunt validate
terragrunt plan

# Test all dev modules
cd iaac/dev
terragrunt run-all validate
terragrunt run-all plan --terragrunt-non-interactive
```

### Expected Output
- ✅ No validation errors
- ✅ Plan shows resources to be created
- ✅ No "placeholder" errors in plan

## 📤 Deployment Checklist

### First Deployment

#### Step 1: Commit and Push
- [ ] Review all changes with `git status`
- [ ] Stage files: `git add .github/workflows/ iaac/`
- [ ] Commit: `git commit -m "Add Terragrunt infrastructure and CI/CD"`
- [ ] Push: `git push origin main`

#### Step 2: Monitor pipeline
- [ ] Go to GitHub: Actions
- [ ] Ensure you pushed changes under `iaac/` so **deploy-dev** runs (it runs only when `iaac/**/*` changes)
- [ ] Wait for **infra** stage: `deploy-dev` (Terragrunt apply)
- [ ] Wait for **dotenv** stage: `generate-dotenv-dev`
- [ ] Backend and frontend build/deploy jobs run in later stages (no manual apply step)

### Post-Deployment Verification
- [ ] Check AWS Console for created resources
- [ ] Verify VPC and subnets created
- [ ] Verify RDS cluster is running
- [ ] Verify S3 buckets created
- [ ] Verify Cognito user pool created
- [ ] Test connectivity (if applicable)

## 🔍 Verification Checklist

### AWS Resources
```bash
# List S3 buckets
aws s3 ls

# List RDS clusters
aws rds describe-db-clusters

# List VPCs
aws ec2 describe-vpcs --filters "Name=tag:Application,Values=my-app"

# List Cognito user pools
aws cognito-idp list-user-pools --max-results 10

# List ECR repositories
aws ecr describe-repositories
```

### Terraform State
```bash
# View state
cd iaac/dev/eu-central-1/vpc
terragrunt state list

# Check outputs
terragrunt output
```

## 📝 Documentation Checklist

### Update Documentation
- [ ] Document any custom configurations
- [ ] Update README with environment-specific info
- [ ] Document manual steps (if any)
- [ ] Add architecture diagram (optional)
- [ ] Share setup guide with team

### Team Onboarding
- [ ] Share credentials securely (1Password, Vault, etc.)
- [ ] Train team on Terragrunt commands
- [ ] Explain CI/CD pipeline (deploy-* when iaac changes, generate-dotenv-*, then backend/frontend; see [.github/workflows/](../../.github/workflows/))
- [ ] Document troubleshooting steps
- [ ] Set up rotation schedule for credentials

## 🔄 Ongoing Maintenance Checklist

### Regular Tasks
- [ ] Rotate AWS credentials every 90 days (`./rotate-credentials.sh`)
- [ ] Review and update Terraform/Terragrunt versions
- [ ] Review AWS costs monthly
- [ ] Check for unused resources
- [ ] Update module versions
- [ ] Review security group rules

### Monthly Reviews
- [ ] Check for Terraform state drift
- [ ] Review CloudWatch logs
- [ ] Check for AWS service updates
- [ ] Review IAM policies
- [ ] Update documentation

## ✅ Sign-off

### Initial Setup
- [ ] All configuration values updated
- [ ] Bootstrap completed successfully
- [ ] GitHub Actions configured
- [ ] First deployment successful
- [ ] Resources verified in AWS Console

**Completed by**: ________________  
**Date**: ________________  
**Signature**: ________________

### Review
- [ ] Peer review completed
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Handoff completed

**Reviewed by**: ________________  
**Date**: ________________  
**Signature**: ________________

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section in README.md
2. Review job logs in GitHub Actions
3. Run commands locally to debug
4. Contact DevOps team

## 🎉 Completion

Once all items are checked:
- ✅ Infrastructure is ready for development
- ✅ CI/CD pipeline is operational
- ✅ Team can deploy changes via GitHub
- ✅ Regular maintenance schedule established
