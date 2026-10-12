# Bitbucket Pull Request Template Guide

> **Complete guide for using PR templates on Bitbucket**

---

## 📋 Template Overview

This repository uses **1 Universal Pull Request template** for Bitbucket:

| Template | File | When to Use |
|----------|------|-------------|
| **Universal PR** | `pull_request_template.md` | ALL changes (backend, frontend, config, CI/CD, docs, infrastructure) |

**Note:** Bitbucket Cloud does not support multiple template selection via UI. The template is automatically loaded from `.bitbucket/pull_request_template.md` when creating a PR.

---

## 🚀 How to Create a PR

### Step 1: Create a Branch

Follow the [Naming Conventions](../backend/docs/contribution.md#naming-conventions) from the Contribution Guide:

```bash
# Feature branches
git checkout -b feat/user-verification
git checkout -b feat/api-v2-endpoints

# Bug fix branches
git checkout -b fix/auth-token-expiration
git checkout -b fix/database-connection-pool

# Chore branches
git checkout -b chore/update-dependencies
git checkout -b chore/ci-pipeline-optimization
```

**Branch Naming Format:**
- `feat/<scope>-<feature>` - New features
- `fix/<scope>-<issue>` - Bug fixes
- `chore/<scope>-<task>` - Maintenance tasks

### Step 2: Make Changes and Commit

Follow the [Commit Message Standards](../backend/docs/contribution.md#commit-message-standards):

```bash
git add .
git commit -m "feat(user): add email verification endpoint"
# or
git commit -m "fix(auth): resolve token expiration check"
# or
git commit -m "docs: update README with Docker instructions"

git push origin feat/user-verification
```

**Commit Message Format:**
```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Step 3: Create Pull Request on Bitbucket

1. Open your repository on Bitbucket
2. Go to **Pull Requests** tab
3. Click **Create Pull Request**
4. Select your branch
5. **Bitbucket automatically loads the template** from `.bitbucket/`

**Important:** Bitbucket uses the template from the **source branch**, not the destination branch.

### Step 4: Fill the Template

**Bitbucket automatically loads** the template from `.bitbucket/pull_request_template.md`.

The template is **universal** and includes sections for:
- ✅ Backend changes (database, API, architecture)
- ✅ Frontend changes (components, styling, accessibility)
- ✅ General changes (config, CI/CD, documentation)

Fill only the sections that apply to your changes.

---

## 📝 Detailed Filling Instructions

### Universal PR Template

#### 1. Description
```markdown
## Description
Brief description of changes (1-2 sentences)
```

#### 2. Jira Ticket
```markdown
## Related Jira Issues
- [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)
```
- Replace `PROJ-123` with your actual Jira ticket number
- Replace `your-company` with your company's Jira subdomain
- Link becomes clickable automatically
- **Jira Integration:** Bitbucket automatically links PR with Jira issue

#### 3. Type of Change
```markdown
## Type of Change
- [x] Bug fix  # Check ONE type
```
**Type Descriptions:**
- **Bug fix** - fixing a bug
- **New feature** - new functionality
- **Breaking change** - changes that break existing API
- **Refactor** - refactoring without functionality changes
- **Documentation** - documentation only
- **Chore** - configuration, dependencies, CI/CD

#### 4. Changes Made
```markdown
## Changes Made
1. Added new endpoint GET /api/users
2. Updated GraphQL schema
3. Added database migration
```

#### 5. Testing
```markdown
## Testing

### Automated Tests
- [x] Unit tests added/updated: `pnpm run test`
- [x] Integration tests added/updated: `pnpm run test:e2e`

### Manual Testing
1. Start server: `pnpm run start:dev`
2. Open: http://localhost:3000/api/users
3. Verify response

**Test Configuration:**
- Node.js Version: 20.x
- Operating System: macOS / Windows / Linux
- Browser (if applicable): Chrome / Firefox / Safari
```

**Note:** Replace commands with your actual test commands (e.g., `npm test`, `yarn test`)

#### 6. Checklist
```markdown
## Checklist

### Code Quality
- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] No unused imports or variables
- [x] Lint/Format check passes
- [x] Build passes

### Testing
- [x] Tests prove the fix is effective or feature works
- [x] New and existing tests pass locally

### Documentation
- [x] Code comments added where needed
- [x] README/docs updated (if applicable)
- [x] New environment variables documented and added to `.env.example`
```

#### 7. Screenshots (if needed)
```markdown
## Screenshots / Logs (if applicable)

| Before | After |
|--------|-------|
| ![Before](link) | ![After](link) |
```

#### 8. Related Issues
```markdown
## Related Issues / PRs
- #123  # Link to other PRs/Issues
```

#### 9. Deployment Notes
```markdown
## Deployment Notes
- [x] Database migration required  # If migration needed
- [ ] Environment variables need to be added
- [ ] Feature flag required
- [ ] Coordination with other teams needed
```

#### 10. Reviewers
```markdown
## Reviewers
<!-- Add reviewers via Bitbucket UI -->
```
- Add reviewers via Bitbucket UI (right panel)

---

### Backend PR Template

#### 1. Description
```markdown
## Description
Description of backend changes
```

#### 2. Jira Ticket
```markdown
## Related Jira Issues
- [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)
```

#### 3. Type of Change
```markdown
## Type of Change
- [x] New feature
- [ ] Database Migration  # Required for migrations
```

#### 4. Database Changes
```markdown
### Database Changes
- [x] Migration created
- [x] Migrations tested (up/down)
- [x] No breaking changes to existing entities
- [x] Foreign keys and indexes properly configured
```

#### 5. API Changes
```markdown
### API Changes
- [x] GraphQL schema updated (if applicable)
- [x] New resolvers/mutations/queries added
- [x] Input/Output DTOs created/updated
- [x] API documentation updated
```

#### 6. Testing
```markdown
### Automated Tests
- [x] Unit tests
- [x] Integration tests

### Manual Testing
1. Start server
2. Test endpoint
3. Verify migrations

**Environment:**
- Node.js: 20.x
- Database: PostgreSQL
- OS: macOS / Windows / Linux
```

#### 7. Backend Checklist
```markdown
## Checklist

### Code Quality
- [x] Code follows coding style guidelines
- [x] Self-review completed
- [x] Linter check passes
- [x] Build passes

### Architecture
- [x] Follows project architecture patterns
- [x] Business logic in domain entities
- [x] No circular dependencies

### Security
- [x] Authentication/authorization implemented
- [x] Input validation using DTOs
- [x] No sensitive data in logs
- [x] SQL injection prevented

### Performance
- [x] No N+1 database queries
- [x] Expensive queries indexed
- [x] Transactions used properly

### Logging & Monitoring
- [x] Critical paths logged
- [x] Error conditions logged with context
- [x] New env vars added to `.env.example`
```

#### 8. Migration Guide
```markdown
## Migration Guide (if applicable)

```bash
# Run migrations
pnpm run db:migrate:up

# Rollback if needed
pnpm run db:migrate:down
```
```

#### 9. Reviewers
```markdown
## Reviewers
<!-- Add reviewers via Bitbucket UI -->
```

---

### Frontend PR Template

#### 1. Description
```markdown
## Description
Description of frontend changes
```

#### 2. Jira Ticket
```markdown
## Related Jira Issues
- [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)
```

#### 3. Type of Change
```markdown
## Type of Change
- [x] New feature
- [ ] UI/UX  # For visual changes
```

#### 4. Component Changes
```markdown
### Component Changes
- [x] New components created
- [ ] Existing components updated
- [x] Component props properly typed
- [x] Responsive design implemented
```

#### 5. State Management
```markdown
### State Management
- [x] State management approach followed
- [x] No unnecessary re-renders
- [x] Proper cleanup in useEffect hooks
```

#### 6. Styling
```markdown
### Styling
- [x] Follows design system guidelines
- [x] Mobile-first responsive approach
- [x] Cross-browser compatibility tested
- [x] Dark mode support (if applicable)
```

#### 7. Testing
```markdown
### Automated Tests
- [x] Unit tests
- [x] E2E tests

### Manual Testing
1. Start dev server
2. Open application in browser
3. Test component functionality

**Environment:**
- Node.js: 20.x
- Browser: Chrome / Firefox / Safari
- OS: macOS / Windows / Linux
- Screen Sizes: Mobile / Tablet / Desktop
```

#### 8. Frontend Checklist
```markdown
## Checklist

### Code Quality
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Linter check passes
- [x] Build passes
- [x] TypeScript types correct (no `any` unless necessary)

### Architecture
- [x] Follows folder structure
- [x] Components properly separated
- [x] Custom hooks used for reusable logic
- [x] No code duplication

### Accessibility (a11y)
- [x] Semantic HTML used
- [x] ARIA labels added where needed
- [x] Keyboard navigation works
- [x] Color contrast meets WCAG standards

### Performance
- [x] Images optimized
- [x] Lazy loading for heavy components
- [x] No unnecessary re-renders
- [x] Bundle size analyzed

### Security
- [x] XSS prevention (dangerouslySetInnerHTML avoided)
- [x] Sensitive data not in localStorage
- [x] API tokens handled securely

### User Experience
- [x] Loading states implemented
- [x] Error states handled gracefully
- [x] Form validation with clear messages
- [x] Consistent with design system
```

#### 9. Browser Compatibility
```markdown
## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome | [x] Tested |
| Firefox | [x] Tested |
| Safari | [ ] Tested |
| Edge | [x] Tested |
```

#### 10. Screenshots
```markdown
## Screenshots (if applicable)

| Before | After |
|--------|-------|
| ![Before](link) | ![After](link) |
```

#### 11. Related PRs
```markdown
## Related Issues / PRs
- [ ] Backend PR: #123
- [ ] Other: #123
```

#### 12. Deployment Notes
```markdown
## Deployment Notes
- [ ] Environment variables needed
- [x] Feature flag required
- [ ] Database migration needed (coordinate with backend)
- [ ] CDN cache invalidation required
```

#### 13. Reviewers
```markdown
## Reviewers
<!-- Add reviewers via Bitbucket UI -->
```

---

## ✅ Pre-PR Checklist

### Required
- [ ] Code tested locally
- [ ] All tests pass
- [ ] Lint check passes
- [ ] Build passes
- [ ] Jira ticket added to description
- [ ] Correct template selected
- [ ] All template sections filled

### Recommended
- [ ] Screenshots added (for UI changes)
- [ ] API examples added (for backend changes)
- [ ] Tested on different browsers (for frontend)
- [ ] Migrations tested (for backend)
- [ ] Documentation updated
- [ ] Reviewers added via UI

---

## 🎯 Template Selection: Quick Reference

**Bitbucket uses ONE universal template** for all changes:

| File | When to Use |
|------|-------------|
| `pull_request_template.md` | ALL changes (backend, frontend, config, CI/CD, docs, infrastructure) |

**How to use:**
- Fill only the sections that apply to your changes
- Backend section - fill only if backend changes
- Frontend section - fill only if frontend changes
- Skip sections that don't apply

---

## 🔗 Jira Integration

### Automatic Linking

Bitbucket automatically links PRs with Jira issues:

1. **Add Jira ticket to description:**
   ```markdown
   ## Related Jira Issues
   - [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)
   ```
   **Note:** Replace `PROJ-123` with your actual ticket (e.g., `LING-456`, `WEB-789`)

2. **Jira key in branch name:**
   ```bash
   git checkout -b PROJ-123-add-new-feature
   ```

3. **Jira key in commit message:**
   ```bash
   git commit -m "PROJ-123: Add new feature"
   ```

### View in Jira

After creating PR:
- Open the issue in Jira
- Go to **Development** panel
- You'll see your PR linked
- PR status syncs with Jira

---

## 📊 PR Workflow on Bitbucket

```
┌─────────────┐
│  Create PR  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Template   │
│  Loads      │
│  Auto       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Fill       │
│  Template   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Add        │
│  Reviewers  │
│  (via UI)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Bitbucket  │
│  Pipelines  │
│  (CI/CD)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Code       │
│  Review     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Approve &  │
│  Merge      │
└─────────────┘
```

---

## 🔧 Bitbucket Features

### Branch Permissions

Configure branch permissions to protect main branches:

1. **Repository Settings** → **Branch permissions**
2. **Add permission**
3. Select branch (e.g., `main`)
4. Enable:
   - ✅ Require pull request
   - ✅ Require approvals (min 1-2)
   - ✅ Require successful build
   - ✅ Require all tasks to be resolved

### Merge Checks

Automated checks before merge:

1. **Repository Settings** → **Merge checks**
2. **Add merge check**
3. Select:
   - ✅ All required approvals
   - ✅ All pipelines completed successfully
   - ✅ All tasks resolved

### Tasks

Add tasks to PR for tracking:

```markdown
- [ ] Fix linting errors
- [ ] Add unit tests
- [ ] Update documentation
```

Tasks appear in UI and block merge until resolved.

### Code Insights

Integration with CI/CD for displaying results:

```yaml
# bitbucket-pipelines.yml
pipelines:
  pull-requests:
    '**':
      - step:
          script:
            - npm run test
            - npm run lint
          reports:
            junit: test-results.xml
```

---

## 📚 Best Practices

### For Authors

1. **Always link to Jira** - add ticket to description
2. **Fill all sections** - don't leave checkboxes empty
3. **Add screenshots** - required for UI changes
4. **Describe testing steps** - so reviewers can verify
5. **Add reviewers immediately** - don't wait after creation

### For Reviewers

1. **Check Jira ticket** - understand change context
2. **Review changes by files** - use File tree
3. **Add contextual comments** - not just "fix this"
4. **Use Tasks** - for tracking required changes
5. **Check Pipelines** - ensure CI passed

### For Teams

1. **Require minimum 1-2 approvals** - for merge
2. **Require successful build** - for merge
3. **Use Merge checks** - for automation
4. **Integrate with Jira** - for tracking
5. **Configure Pipelines** - for automated testing

---

## 📚 Useful Links

- [Bitbucket Docs: Pull Requests](https://support.atlassian.com/bitbucket-cloud/docs/create-a-pull-request/)
- [Bitbucket Docs: PR Templates](https://confluence.atlassian.com/spaces/BBKB/pages/1540228139/Pull+Request+templates+in+Bitbucket+Cloud)
- [Bitbucket Docs: Jira Integration](https://support.atlassian.com/bitbucket-cloud/docs/integrate-with-jira/)
- [Bitbucket Docs: Branch Permissions](https://support.atlassian.com/bitbucket-cloud/docs/branch-restrictions/)
- [Bitbucket Docs: Merge Checks](https://support.atlassian.com/bitbucket-cloud/docs/merge-checks/)

---

## 📝 Notes

### Commands

Replace test/build commands with your actual project commands:
- `pnpm run test` → your test command
- `pnpm run lint` → your lint command
- `pnpm run build` → your build command

### URLs

Replace placeholder URLs:
- `http://localhost:3000` → your dev server URL
- `your-company.atlassian.net` → your Jira subdomain

### Jira Tickets

Replace `PROJ-123` with your actual ticket format:
- `LING-456` (Lingvist project)
- `WEB-789` (Web team)
- `API-101` (API team)

---

**Version:** 2.0  
**Last Updated:** 2026-02-17  
**Maintained by:** Development Team
