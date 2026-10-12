# Backend Pull Request

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
- [ ] **Database Migration** (requires running migrations)

---

## Technical Details

### Database Changes

- [ ] New migration created: `pnpm run db:migrate:create`
- [ ] Migrations tested: `pnpm run db:migrate:up` / `pnpm run db:migrate:down`
- [ ] No breaking changes to existing entities
- [ ] Foreign keys and indexes properly configured

### API Changes

- [ ] GraphQL schema updated (if applicable)
- [ ] New resolvers/mutations/queries added
- [ ] Input/Output DTOs created/updated
- [ ] API documentation updated

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
* **Database:** PostgreSQL
* **Operating System:** `macOS / Windows / Linux`

---

## Backend Checklist

### Code Quality

- [ ] My code follows the project's [coding style guidelines](./backend/docs/contribution.md#coding-style)
- [ ] I have performed a self-review of my own code
- [ ] Biome check passes: `pnpm run check`
- [ ] Build passes: `pnpm run build`
- [ ] No unused imports or variables

### Architecture

- [ ] Follows Vertical Slice Architecture principles
- [ ] Business logic is in domain entities (rich domain model)
- [ ] CQRS pattern used correctly (Commands/Queries)
- [ ] No circular dependencies between modules

### Security

- [ ] All new endpoints protected by authentication/authorization
- [ ] Input validation using DTOs and class-validator
- [ ] No sensitive data in logs
- [ ] SQL injection prevented (using MikroORM)

### Performance

- [ ] No N+1 database queries
- [ ] Expensive queries are indexed
- [ ] Proper use of transactions
- [ ] Lambda cold start optimized (minimal imports)

### Logging & Monitoring

- [ ] Critical success paths logged
- [ ] Error conditions logged with context
- [ ] OpenTelemetry spans added for critical paths (if applicable)
- [ ] New environment variables added to `.env.example`

### Reliability

- [ ] Code handles null/undefined values gracefully
- [ ] Proper error handling with try-catch
- [ ] Database transactions used where needed
- [ ] Idempotency considered (for mutations)

---

## Migration Guide (if applicable)

<!-- Describe any steps needed to migrate existing data or configurations -->

```bash
# Example migration commands
pnpm run db:migrate:up
```

---

## Screenshots (if applicable)

<!-- For API changes, include GraphQL query/mutation examples -->

**Before:**
```graphql
# Example query/mutation
```

**After:**
```graphql
# Example query/mutation
```

---

## Related PRs

<!-- List any related PRs in frontend or other repositories -->

- [ ] Frontend PR: #[PR_NUMBER]
- [ ] Other: #[PR_NUMBER]
