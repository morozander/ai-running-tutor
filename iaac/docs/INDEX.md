# Infrastructure as Code Documentation Index

## 📚 Documentation Overview

This directory contains comprehensive documentation for managing AWS infrastructure using Terragrunt and GitHub Actions.

## 🗂️ Document Guide

### For First-Time Setup

1. **[SUMMARY.md](SUMMARY.md)** ⭐ START HERE
   - Overview of the entire setup
   - Quick understanding of what's included
   - Success criteria and next steps
   - **Time**: 10 minutes reading

2. **[QUICKSTART.md](QUICKSTART.md)** 🚀 FASTEST PATH
   - Get up and running in 15 minutes
   - Step-by-step commands
   - Troubleshooting common issues
   - **Time**: 15 minutes to deploy

3. **[CHECKLIST.md](CHECKLIST.md)** ✅ MOST THOROUGH
   - Complete step-by-step checklist
   - Nothing missed
   - Sign-off sections
   - **Time**: 30-45 minutes

4. **[BOOTSTRAP procedure](BOOTSTRAP.md)** 📦 DEVOPS PROCEDURE
   - Full procedure from repo download (tar.gz) through Git init, `make`, `gh auth login`, gsnake-modules deploy key (GitHub)
   - Do not push until procedure is complete
   - **Time**: 20-40 minutes

### For Configuration

5. **[GITHUB_SECRETS.md](GITHUB_SECRETS.md)** 🔐 REQUIRED
   - How to configure CI/CD variables
   - Security best practices
   - Testing and troubleshooting
   - **Time**: 5 minutes

6. **[README.md](README.md)** 📖 COMPREHENSIVE GUIDE
   - Complete setup instructions
   - Architecture overview
   - Usage examples
   - Troubleshooting guide
   - **Time**: 30 minutes reading

### For Review and Maintenance

7. **[CODE_REVIEW.md](CODE_REVIEW.md)** 🔍 TECHNICAL REVIEW
   - Infrastructure code analysis
   - Issues and recommendations
   - Security review
   - Action items
   - **Time**: 20 minutes

8. **Scripts**
   - `scripts/bootstrap.sh` - Initial AWS setup
   - `rotate-credentials.sh` - Credential rotation
   - `iam-policy.json` - IAM policy reference

## 🎯 Choose Your Path

### Path 1: Quick Deploy (15 minutes)
```
QUICKSTART.md → GITHUB_SECRETS.md → Deploy!
```
Best for: Experienced users, proof of concept, demos

### Path 2: Complete Setup (1 hour)
```
SUMMARY.md → CHECKLIST.md → GITHUB_SECRETS.md → README.md → Deploy!
```
Best for: Production deployments, teams, first-time users

### Path 3: Review and Understand (30 minutes)
```
SUMMARY.md → CODE_REVIEW.md → README.md
```
Best for: Reviewers, architects, managers

## 📋 Quick Reference

### Essential Commands

```bash
# Bootstrap AWS resources
cd iaac && ./scripts/bootstrap.sh

# Local testing
cd iaac/dev
terragrunt run-all validate
terragrunt run-all plan

# Rotate credentials
cd iaac && ./rotate-credentials.sh

# Check Terraform state
terragrunt state list
```

### Essential Files

```
.github/workflows/              # CI/CD pipeline
iaac/root.hcl               # Root configuration
iaac/dev/environment.hcl    # Dev environment config
iaac/shared/environment.hcl # Shared environment config
```

### GitHub Actions secrets (Required)

| Variable | Where to Get |
|----------|--------------|
| `AWS_ACCESS_KEY_ID` | From `scripts/bootstrap.sh` output |
| `AWS_SECRET_ACCESS_KEY` | From `scripts/bootstrap.sh` output |
| `AWS_DEFAULT_REGION` | Your AWS region (e.g., `eu-central-1`) |

## 🔗 Document Relationships

```
SUMMARY.md (Overview)
    ├── QUICKSTART.md (Fast path)
    │   └── GITHUB_SECRETS.md
    │       └── Deploy!
    │
    ├── CHECKLIST.md (Thorough path)
    │   ├── scripts/bootstrap.sh
    │   ├── GITHUB_SECRETS.md
    │   └── Deploy!
    │
    └── README.md (Reference)
        ├── CODE_REVIEW.md (Technical)
        ├── rotate-credentials.sh
        └── iam-policy.json

```

## 🎓 Learning Resources

### Beginners
1. Start with SUMMARY.md to understand the system
2. Follow QUICKSTART.md for hands-on experience
3. Read README.md for deeper understanding

### Intermediate
1. Review CODE_REVIEW.md for architecture details
2. Study root.hcl and environment files
3. Experiment with local Terragrunt commands

### Advanced
1. Customize pipeline in .github/workflows/
2. Modify IAM policy for specific needs
3. Add custom modules and environments

## 🔄 Update Frequency

| Document | Update When |
|----------|-------------|
| SUMMARY.md | Major changes to setup |
| QUICKSTART.md | Process improvements |
| CHECKLIST.md | New requirements |
| README.md | Feature additions |
| CODE_REVIEW.md | After major changes |
| GITHUB_SECRETS.md | Security policy changes |

## 🆘 Getting Help

### Quick Issues
- Check QUICKSTART.md troubleshooting section
- Review GitHub Actions job logs
- Test commands locally

### Configuration Issues
- Verify CHECKLIST.md completed
- Check GITHUB_SECRETS.md setup
- Review placeholder values replaced

### Infrastructure Issues
- See README.md troubleshooting
- Check CODE_REVIEW.md recommendations
- Review AWS Console for errors

## ✅ Pre-Deployment Checklist

Before deploying, ensure:
- [ ] Read SUMMARY.md (understand what you're building)
- [ ] Followed QUICKSTART.md or CHECKLIST.md
- [ ] Configured GITHUB_SECRETS.md
- [ ] Replaced all placeholder values
- [ ] Ran scripts/bootstrap.sh successfully
- [ ] Tested locally (optional but recommended)

## 🎯 Success Metrics

You know the setup is successful when:
- ✅ Bootstrap script completed without errors
- ✅ GitHub Actions pipeline runs (deploy-dev when iaac changes, then generate-dotenv-dev and backend/frontend)
- ✅ Infrastructure resources appear in AWS Console
- ✅ Team can deploy changes through GitHub
- ✅ Manual approval workflow functions correctly

## 📞 Support Escalation

1. **Self-Service**: Documentation in this directory
2. **Team Help**: Consult with DevOps team
3. **Vendor Support**: Contact AWS Support (if needed)

## 🔐 Security Notes

- Never commit credentials to Git
- Rotate credentials every 90 days
- Use secret values in GitHub
- Review audit logs regularly
- Follow principle of least privilege

## 🎉 Ready to Deploy?

Choose your path above and follow the documentation. Good luck! 🚀

---

**Documentation Version**: 1.0  
**Last Updated**: 2026-02-14  
**Maintained By**: DevOps Team
