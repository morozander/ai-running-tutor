# Pull Request

## Description

<!-- Provide a brief description of the changes -->

**Jira Ticket:** [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)

---

## Type of Change

<!-- Check ONE that applies -->
- [ ] 🐛 **Bug fix** (non-breaking change which fixes an issue)
- [ ] ✨ **New feature** (non-breaking change which adds functionality)
- [ ] 💥 **Breaking change** (fix or feature that would cause existing functionality to not work as expected)
- [ ] ♻️ **Refactor** (non-breaking change that neither fixes a bug nor adds a feature)
- [ ] 📝 **Documentation** (changes to documentation only)
- [ ] ⚙️ **Chore** (e.g., updating dependencies, configuring CI/CD)
- [ ] 🚀 **Performance** (performance improvements)
- [ ] 🔒 **Security** (security-related changes)

---

## Scope

<!-- Check all that apply -->
- [ ] **Backend** (`/backend`)
- [ ] **Frontend** (`/frontend`)
- [ ] **Shared** (configuration, documentation, etc.)
- [ ] **CI/CD** (workflows, actions)
- [ ] **Infrastructure** (Docker, Terraform, etc.)

---

## Technical Details

<!-- Describe the technical implementation details -->

### Changes Made

1. 
2. 
3. 

---

## Testing

### Automated Tests
- [ ] **Unit Tests:** `pnpm run test`
- [ ] **Integration Tests:** `pnpm run test:e2e`
- [ ] **E2E Tests:** `pnpm run test:e2e`

### Manual Testing

**Steps to reproduce:**
1. 
2. 
3. 

**Expected result:**


**Test Configuration:**
- **Node.js Version:** `20.x`
- **Operating System:** `macOS / Windows / Linux`
- **Browser (if applicable):** `Chrome / Firefox / Safari`
- **Screen Sizes (if applicable):** `Mobile / Tablet / Desktop`

---

## Checklist

### Code Quality
- [ ] My code follows the project's coding style guidelines
- [ ] I have performed a self-review of my own code
- [ ] Lint/Format check passes
- [ ] Build passes
- [ ] No unused imports or variables

### Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have commented my code, particularly in hard-to-understand areas

### Documentation
- [ ] I have made corresponding changes to the documentation (e.g., `README.md`)
- [ ] New environment variables are documented and added to `.env.example`
- [ ] API changes are documented (if applicable)

### Security & Performance
- [ ] My changes generate no new security warnings
- [ ] No new N+1 queries or performance regressions
- [ ] Input data is validated (for backend)
- [ ] Authentication/authorization implemented (if required)

---

## Backend-Specific (if applicable)

<!-- Fill only if this PR includes backend changes -->

### Database Changes
- [ ] New migration created: `pnpm run db:migrate:create`
- [ ] Migrations tested: `pnpm run db:migrate:up` / `pnpm run db:migrate:down`
- [ ] No breaking changes to existing entities
- [ ] Foreign keys and indexes properly configured

### API Changes
- [ ] GraphQL schema updated (if applicable)
- [ ] New resolvers/mutations/queries added
- [ ] Input/Output DTOs created/updated

### Backend Architecture
- [ ] Follows Vertical Slice Architecture principles
- [ ] Business logic is in domain entities
- [ ] CQRS pattern used correctly (Commands/Queries)
- [ ] No circular dependencies between modules

---

## Frontend-Specific (if applicable)

<!-- Fill only if this PR includes frontend changes -->

### Component Changes
- [ ] New components created
- [ ] Existing components updated
- [ ] Component props properly typed
- [ ] Responsive design implemented

### State Management
- [ ] State management approach followed
- [ ] No unnecessary re-renders
- [ ] Proper cleanup in useEffect hooks

### Accessibility (a11y)
- [ ] Semantic HTML used
- [ ] ARIA labels added where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards

### Browser Compatibility
- [ ] Chrome tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Edge tested

---

## Screenshots / Logs (if applicable)

<!-- Include screenshots, logs, or other relevant information for UI changes or API changes -->

| Before | After |
| :----: | :---: |
|        |       |

**For API changes (if applicable):**

**Before:**
```graphql
# Example query/mutation
```

**After:**
```graphql
# Example query/mutation
```

---

## Related Issues / PRs

<!-- List any related issues or PRs -->

- #[ISSUE_NUMBER]
- #[PR_NUMBER]

---

## Deployment Notes

<!-- Check all that apply -->
- [ ] Database migration required
- [ ] Environment variables need to be added
- [ ] Feature flag required
- [ ] Coordination with other teams needed
- [ ] CDN cache invalidation required

**Additional notes:**


---

## Reviewers

<!-- Add reviewers via Bitbucket UI (right panel) -->
