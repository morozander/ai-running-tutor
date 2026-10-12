# Pull Request Template Guide

> **Complete guide for using PR templates on GitHub**

---

## 📋 Template Overview

This repository uses **3 Pull Request templates**:

| Template | File | When to Use |
|----------|------|-------------|
| **Universal PR** | `pull_request_template.md` | Any changes (config, CI/CD, docs, infrastructure) |
| **Backend PR** | `pull_request_template_backend.md` | Changes in `/backend` |
| **Frontend PR** | `pull_request_template_frontend.md` | Changes in `/frontend` |

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

### Step 3: Create Pull Request on GitHub

1. Open your repository on GitHub
2. Go to **Pull Requests** tab
3. Click **New Pull Request**
4. Select your branch
5. GitHub will offer to **choose a template** (right side: "Choose a template")

### Step 4: Choose Template

#### **Universal PR** (`pull_request_template.md`)
Use for:
- ✅ Configuration changes (`.env`, `package.json`, etc.)
- ✅ CI/CD changes (workflows, actions)
- ✅ Documentation (`README.md`, guides)
- ✅ Infrastructure (Docker, Terraform)
- ✅ Shared utilities

#### **Backend PR** (`pull_request_template_backend.md`)
Use for:
- ✅ API changes (new endpoints, mutations, queries)
- ✅ Database changes (migrations, entities)
- ✅ Business logic (domain, services)
- ✅ GraphQL schema
- ✅ Backend tests

#### **Frontend PR** (`pull_request_template_frontend.md`)
Use for:
- ✅ UI components
- ✅ Styles and layout
- ✅ State management changes
- ✅ Frontend tests (unit, E2E)
- ✅ Accessibility changes

### Step 5: Fill the Template

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
**Jira Ticket:** [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)
```
- Replace `PROJ-123` with your ticket number
- Link should be clickable

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
- **Performance** - performance improvements
- **Security** - security-related changes

#### 4. Scope
```markdown
## Scope
- [x] Backend  # Check what applies
- [ ] Frontend
- [ ] Shared
- [x] CI/CD
```

#### 5. Technical Details
```markdown
## Technical Details

### Changes Made
1. Added new endpoint GET /api/users
2. Updated GraphQL schema
3. Added database migration
```

#### 6. Testing
```markdown
### Testing
- [x] Unit Tests: `pnpm run test`
- [x] Integration Tests: `pnpm run test:e2e`

### Manual Testing
1. Start server: `pnpm run start:dev`
2. Open: http://localhost:3000/api/users
3. Verify response

**Test Configuration:**
* Node.js Version: `20.x`
* Operating System: `macOS`
```

#### 7. Checklist
```markdown
## Checklist

### Code Quality
- [x] My code follows the project's coding style guidelines
- [x] I have performed a self-review of my own code
- [x] Lint/Format check passes
- [x] Build passes
```

#### 8. Screenshots (if needed)
```markdown
## Screenshots

| Before | After |
|--------|-------|
| ![Before](link) | ![After](link) |
```

#### 9. Related Issues
```markdown
## Related Issues / PRs
- #123  # Link to other PRs/Issues
```

#### 10. Deployment Notes
```markdown
## Deployment Notes
- [x] Database migration required  # If migration needed
- [ ] Environment variables need to be added
- [ ] Feature flag required
```

---

### Backend PR Template

#### 1. Description
```markdown
## Description
Description of backend changes
```

#### 2. Jira Ticket
```markdown
**Jira Ticket:** [PROJ-123](url)
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
- [x] New migration created: `pnpm run db:migrate:create`
- [x] Migrations tested: `pnpm run db:migrate:up` / `pnpm run db:migrate:down`
- [x] No breaking changes to existing entities
- [x] Foreign keys and indexes properly configured
```

#### 5. API Changes
```markdown
### API Changes
- [x] GraphQL schema updated
- [x] New resolvers/mutations/queries added
- [x] Input/Output DTOs created/updated
- [x] API documentation updated
```

#### 6. Backend Checklist
```markdown
## Backend Checklist

### Code Quality
- [x] My code follows the project's coding style guidelines
- [x] I have performed a self-review of my own code
- [x] Biome check passes: `pnpm run check`
- [x] Build passes: `pnpm run build`

### Architecture
- [x] Follows Vertical Slice Architecture principles
- [x] Business logic is in domain entities
- [x] CQRS pattern used correctly
- [x] No circular dependencies between modules

### Security
- [x] All new endpoints protected by authentication/authorization
- [x] Input validation using DTOs and class-validator
- [x] No sensitive data in logs
- [x] SQL injection prevented

### Performance
- [x] No N+1 database queries
- [x] Expensive queries are indexed
- [x] Proper use of transactions
- [x] Lambda cold start optimized

### Logging & Monitoring
- [x] Critical success paths logged
- [x] Error conditions logged with context
- [x] OpenTelemetry spans added (if applicable)
- [x] New env vars added to `.env.example`

### Reliability
- [x] Code handles null/undefined values gracefully
- [x] Proper error handling with try-catch
- [x] Database transactions used where needed
- [x] Idempotency considered (for mutations)
```

#### 7. Migration Guide
```markdown
## Migration Guide

```bash
pnpm run db:migrate:up
```
```

#### 8. API Examples
```markdown
## Screenshots (if applicable)

**Before:**
```graphql
query {
  users {
    id
    name
  }
}
```

**After:**
```graphql
query {
  users {
    id
    name
    email
    createdAt
  }
}
```
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
**Jira Ticket:** [PROJ-123](url)
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

#### 7. Frontend Checklist
```markdown
## Frontend Checklist

### Code Quality
- [x] My code follows the project's coding style guidelines
- [x] I have performed a self-review of my own code
- [x] ESLint/Prettier check passes: `pnpm run lint`
- [x] Build passes: `pnpm run build`
- [x] TypeScript types are correct (no `any` unless necessary)

### Architecture
- [x] Follows project folder structure
- [x] Components are properly separated
- [x] Custom hooks used for reusable logic
- [x] No code duplication

### Accessibility (a11y)
- [x] Semantic HTML used
- [x] ARIA labels added where needed
- [x] Keyboard navigation works
- [x] Color contrast meets WCAG standards
- [x] Screen reader tested

### Performance
- [x] Images optimized (WebP, proper sizing)
- [x] Lazy loading implemented for heavy components
- [x] No unnecessary re-renders (React.memo, useMemo, useCallback)
- [x] Bundle size analyzed (no large dependencies added)

### Security
- [x] XSS prevention (dangerouslySetInnerHTML avoided)
- [x] Sensitive data not stored in localStorage
- [x] API tokens handled securely
- [x] CSRF protection considered

### User Experience
- [x] Loading states implemented
- [x] Error states handled gracefully
- [x] Form validation with clear error messages
- [x] Success feedback provided
- [x] Consistent with design system
```

#### 8. Browser Compatibility
```markdown
## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome | [x] Tested |
| Firefox | [x] Tested |
| Safari | [ ] Tested |
| Edge | [x] Tested |
```

#### 9. Screenshots
```markdown
## Screenshots

| Before | After |
|--------|-------|
| ![Before](link) | ![After](link) |
```

#### 10. Deployment Notes
```markdown
## Deployment Notes
- [ ] Environment variables need to be added
- [x] Feature flag required
- [ ] Database migration needed (coordinate with backend)
- [ ] CDN cache invalidation required
```

---

## ✅ Pre-PR Checklist

### Required
- [ ] Code tested locally
- [ ] All tests pass: `pnpm run test`
- [ ] Lint passes: `pnpm run lint` or `pnpm run check`
- [ ] Build passes: `pnpm run build`
- [ ] Jira ticket added to description
- [ ] Correct template selected
- [ ] All template sections filled

### Recommended
- [ ] Screenshots added (for UI changes)
- [ ] API examples added (for backend changes)
- [ ] Tested on different browsers (for frontend)
- [ ] Migrations tested (for backend)
- [ ] Documentation updated

---

## 🎯 Template Selection: Quick Reference

| Changes | Template |
|---------|----------|
| Backend only | `pull_request_template_backend.md` |
| Frontend only | `pull_request_template_frontend.md` |
| Backend + Frontend | Both templates or Universal |
| Configuration only | `pull_request_template.md` |
| CI/CD only | `pull_request_template.md` |
| Documentation only | `pull_request_template.md` |
| Infrastructure (Docker, etc.) | `pull_request_template.md` |

---

## 📚 Useful Links

- [GitHub Docs: Creating a PR](https://docs.github.com/en/pull-requests)
- [Backend Contribution Guide](./backend/docs/contribution.md)
- [Frontend Contribution Guide](./frontend/docs/contribution.md)

---

**Version:** 2.0  
**Last Updated:** 2026-02-17  
**Maintained by:** Development Team
