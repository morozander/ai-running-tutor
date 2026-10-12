# Infrastructure Setup - Summary

## 📦 What Has Been Created

This setup provides a complete GitHub Actions pipeline for managing AWS infrastructure using Terragrunt and Terraform.

### Files Created

```
.github/workflows/                    # GitHub Actions pipeline configuration
iaac/
├── scripts/
│   └── bootstrap.sh              # Script to create AWS resources and IAM user
├── rotate-credentials.sh         # Script to rotate AWS access keys
├── iam-policy.json              # IAM policy document (reference)
├── .gitignore                   # Ignore Terraform/Terragrunt temporary files
├── README.md                    # Comprehensive setup guide
├── QUICKSTART.md                # Quick start guide (15 minutes)
├── CHECKLIST.md                 # Step-by-step checklist
└── CODE_REVIEW.md               # Infrastructure code review
```

## 🎯 Key Features

### 1. Bootstrap Script (`iaac/scripts/bootstrap.sh`)
Automatically creates:
- ✅ S3 bucket for Terraform state (encrypted, versioned)
- ✅ DynamoDB table for state locking
- ✅ IAM user for CI with custom policy
- ✅ Access keys for CI/CD
- ✅ Security configurations (public access blocked, encryption enabled)

### 2. GitHub Actions pipeline (infra + dotenv)

The monorepo pipeline (see root [SETUP.md](../../SETUP.md) and [.github/workflows/](../../.github/workflows/)) includes:

#### Infra stage
- **Jobs**: `deploy-dev`, `deploy-staging`, `deploy-production`
- **When**: Only when there are **changes under `iaac/**/*`** (and branch/tag matches). No separate validate or plan stage; Terragrunt apply runs via CI scripts.
- **Branch/tag**: dev = `main`, staging = `release/*`, production = tag `release/*`.

#### Dotenv stage
- **Jobs**: `generate-dotenv-dev`, `generate-dotenv-staging`, `generate-dotenv-production`
- Produce the `build.env` report (Terragrunt outputs) used by backend and frontend build/deploy jobs.

#### Pipeline features
- ✅ deploy-* runs only when `iaac/**/*` changes
- ✅ Environment separation (dev, staging, production)
- ✅ Dotenv report passed to backend and frontend jobs

### 3. IAM Policy (Custom)

**Near-AdministratorAccess with Restrictions:**
- ✅ Can create/manage IAM roles and policies
- ✅ Can create any AWS infrastructure
- ✅ Can read IAM users (for auditing)
- ❌ Cannot create/delete/modify IAM users
- ❌ Cannot create/delete user access keys
- ❌ Cannot leave organization or close account

This follows security best practices by preventing:
- Privilege escalation through user creation
- Unauthorized access key generation
- Accidental account closure

### 4. Credential Management

**Bootstrap Script**:
- Creates IAM user with appropriate permissions
- Generates access keys
- Saves credentials securely to timestamped file

**Rotation Script** (`rotate-credentials.sh`):
- Safely rotates AWS access keys
- Maintains zero-downtime during rotation
- Provides step-by-step guidance

## 🚀 Quick Start

### 1. Update Configuration (5 minutes)
```bash
# Edit iaac/root.hcl
application_id = "my-app"
aws_root_profile = "default"
tf_state_default_region = "eu-central-1"
```

### 2. Run Bootstrap (3 minutes)
```bash
cd iaac
./scripts/bootstrap.sh
# Save the credentials output!
```

### 3. Configure GitHub (2 minutes)
Add CI/CD variables:
- `AWS_ACCESS_KEY_ID` (from bootstrap)
- `AWS_SECRET_ACCESS_KEY` (from bootstrap)
- `AWS_DEFAULT_REGION` (e.g., `eu-central-1`)

### 4. Deploy (5 minutes)
```bash
git add .github/workflows/ iaac/
git commit -m "Add Terragrunt infrastructure"
git push origin main
```

Then in GitHub:
1. Push a change under `iaac/` to `main` so **deploy-dev** runs (it only runs when `iaac/**/*` changes).
2. **generate-dotenv-dev** runs and produces the dotenv report.
3. Backend and frontend build/deploy jobs run in later stages. No manual apply step.

## 📋 Infrastructure Components

### Dev Environment
- **VPC**: Network with public, private, and database subnets
- **RDS Aurora**: PostgreSQL database cluster
- **S3**: Storage buckets
- **Cognito**: User authentication
- **API Gateway**: HTTP API
- **Security Groups**: Network security
- **Secrets Manager**: Secure secret storage
- **Jumpbox**: EC2 instance for SSH access

### Shared Environment
- **ECR**: Container registry
- **CI/CD Roles**: IAM roles for pipelines
- **G-Opportunity**: Shared application resources

## 🔐 Security Features

### State Management
- S3 bucket encryption (AES-256)
- S3 versioning enabled
- DynamoDB locking
- Public access blocked

### IAM Security
- Custom policy (near-admin without user management)
- Credential rotation support
- Access key lifecycle management
- Regular rotation reminders (90 days)

### CI/CD Security
- Masked secrets in GitHub
- Protected variables (main branch only)
- Manual approval for infrastructure changes
- Plan review before apply

## 📊 Pipeline Workflow

```
┌─────────────────────┐
│  Push to main       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validate Stage     │ ← Automatic
│  - Format check     │
│  - Config check     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Plan Stage         │ ← Automatic
│  - plan:dev         │
│  - plan:shared      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Review Plan Output │ ← Human Review
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Apply Stage        │ ← Manual Approval
│  - apply:dev ▶️     │
│  - apply:shared ▶️  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Infrastructure     │
│  Deployed! ✅       │
└─────────────────────┘
```

## 🎓 User Roles and Workflows

### DevOps Engineer (Initial Setup)
1. Run bootstrap script
2. Configure GitHub Actions secrets
3. Update configuration files
4. Test first deployment
5. Train team members

### Developer (Day-to-Day)
1. Make changes to Terragrunt files
2. Commit and push to feature branch
3. Create merge request
4. Pipeline runs plan automatically
5. Review plan in MR
6. Merge to main
7. Save in GitHub

### Reviewer (Code Review)
1. Review Terragrunt code changes
2. Check plan output in CI pipeline
3. Verify resources match requirements
4. Approve merge request
5. Monitor apply job

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| `README.md` | Complete setup guide | All team members |
| `QUICKSTART.md` | Fast setup (15 min) | New users |
| `CHECKLIST.md` | Step-by-step tasks | DevOps, Implementers |
| `CODE_REVIEW.md` | Infrastructure review | Technical reviewers |
| This file | Summary overview | Management, stakeholders |

## ⚠️ Important Notes

### Before First Deployment

1. **Replace Placeholder Values**
   - Search for `<application-id>`, `<domain_name>`, etc.
   - Update all configuration files
   - Validation will fail if placeholders remain

2. **Lambda Dependencies**
   - Cognito module references Lambda functions
   - Either create Lambda modules OR remove dependencies
   - See CODE_REVIEW.md for details

3. **Domain/DNS Configuration**
   - Decide on custom domain strategy
   - ACM and Route53 modules were removed
   - Update if using custom domains

### Estimated Costs

- **Development Environment**: $100-300/month
  - VPC NAT Gateway: ~$32/month
  - RDS Aurora: $50-150/month
  - S3, EC2, other services: $20-100/month

- **Shared Resources**: $10-50/month
  - ECR: $5-20/month
  - Other resources: minimal

**Total**: ~$150-400/month depending on usage

### Maintenance Schedule

- **Weekly**: Review pipeline runs, check for failures
- **Monthly**: Review AWS costs, check for drift
- **Quarterly**: Rotate credentials, review security
- **Annually**: Update Terraform/Terragrunt versions

## 🐛 Troubleshooting

### Common Issues

1. **"Bucket already exists"**
   - Change `application_id` to make bucket name unique

2. **"Access Denied" in pipeline**
   - Verify GitHub Actions secrets (see [GITHUB_SECRETS.md](GITHUB_SECRETS.md))
   - Check IAM policy attachment

3. **"Placeholder value" error**
   - Update all `<placeholder>` values in configs

4. **Plan cache expired**
   - Re-run pipeline (e.g. push an empty commit or re-run from GitHub Actions)

See README.md for detailed troubleshooting.

## ✅ Success Criteria

The setup is successful when:
- ✅ Bootstrap script completes without errors
- ✅ GitHub Actions pipeline runs (deploy-dev when iaac changes, then generate-dotenv-dev and backend/frontend jobs)
- ✅ Apply creates expected AWS resources
- ✅ Resources visible in AWS Console
- ✅ Team can make changes via GitHub
- ✅ Manual approval workflow works

## 🔄 Next Steps

### Immediate (After Setup)
1. Review and approve first deployment
2. Verify resources in AWS Console
3. Test connectivity and functionality
4. Document any custom configurations

### Short-term (1-2 weeks)
1. Add monitoring and alerting
2. Set up cost budgets and alerts
3. Configure backup strategies
4. Add automated testing

### Long-term (1-3 months)
1. Implement drift detection schedule
2. Add security scanning (tfsec, checkov)
3. Set up disaster recovery
4. Optimize costs

## 📞 Support

For issues or questions:
1. Check documentation in `iaac/` directory
2. Review GitHub Actions job logs
3. Run commands locally to debug
4. Contact DevOps team

## 🎉 Conclusion

This setup provides:
- ✅ Automated infrastructure deployment
- ✅ Safe change management with manual approval
- ✅ Secure credential management
- ✅ Environment separation
- ✅ State management and locking
- ✅ Comprehensive documentation

**Ready to deploy!** Follow the QUICKSTART.md or CHECKLIST.md to begin.

---

**Created**: 2026-02-14  
**Version**: 1.0  
**Status**: Ready for deployment
