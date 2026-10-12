# Pull Request

## Description

<!-- Provide a brief description of the changes -->

**Jira Ticket:** [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)

## Type of Change

- [ ] **Bug fix** (non-breaking change which fixes an issue)
- [ ] **New feature** (non-breaking change which adds functionality)
- [ ] **Breaking change** (fix or feature that would cause existing functionality to not work as expected)
- [ ] **Refactor** (non-breaking change that neither fixes a bug nor adds a feature)
- [ ] **Documentation** (changes to documentation only)
- [ ] **Chore** (e.g., updating dependencies, configuring CI/CD)
- [ ] **Performance** (performance improvements)
- [ ] **Security** (security-related changes)

---

## Scope

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

### Testing

- [ ] **Unit Tests:** `pnpm run test`
- [ ] **Integration Tests:** `pnpm run test:e2e`
- [ ] **Manual Testing:**
  - Steps to reproduce:
    1. ...
    2. ...
    3. ...

**Test Configuration:**
* **Node.js Version:** `20.x`
* **Operating System:** `macOS / Windows / Linux`

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

## Screenshots / Logs (if applicable)

<!-- Include screenshots, logs, or other relevant information -->

| Before | After |
| :----: | :---: |
|        |       |

---

## Related Issues / PRs

<!-- List any related issues or PRs -->

- #[ISSUE_NUMBER]
- #[PR_NUMBER]

---

## Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] Database migration required
- [ ] Environment variables need to be added
- [ ] Feature flag required
- [ ] Coordination with other teams needed
