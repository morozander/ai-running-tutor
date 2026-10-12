# Code Review Guidelines — Backend

> **Goal:** Ensure high code quality in the backend project through effective code review.

---

## 📋 1. Branch Naming

**Format:**
```
<type>/<description>
```

**Available Types:**

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New functionality (API, service) | `feat/user-authentication` |
| `fix` | Bug fix | `fix/login-error` |
| `refactor` | Refactoring without functional changes | `refactor/database-module` |
| `docs` | Documentation changes | `docs/api-documentation` |
| `chore` | Technical changes (dependencies, configs) | `chore/dependency-update` |
| `test` | Adding/updating tests | `test/auth-service` |
| `perf` | Performance improvements | `perf/query-optimization` |
| `db` | Database migrations | `db/add-user-index` |

**Rules:**
- Use `kebab-case` (lowercase only, hyphens for separation)
- Maximum 3-5 words in description
- Avoid generic words ("update", "fix-stuff")

---

## 📝 2. Commit Message

**Format (Conventional Commits):**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(auth): add user registration

- Added AuthController with /auth/register endpoint
- Added AuthService with user creation logic
- Added email and password validation
- Added welcome email sending

Closes ISSUE-123
```

**Rules:**
- **Subject:** ≤ 50 characters, present tense ("add" not "added")
- **Body:** ≤ 72 characters per line, describes **WHAT** and **WHY** (not HOW)
- **Footer:** Link to issue (`Closes ISSUE-123`, `Fixes ISSUE-456`)

**Commit Types:**
| Type | When |
|------|------|
| `feat` | New functionality (API endpoint, service) |
| `fix` | Bug fix |
| `refactor` | Refactoring without functional changes |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `chore` | Technical changes (dependencies, configs) |
| `test` | Tests (unit, e2e) |
| `perf` | Performance (query optimization) |
| `db` | Database migrations |
| `build` | Build system or dependencies |
| `ci` | CI/CD configuration |
| `revert` | Revert a previous commit |

---

## 🔀 3. Pull Request

### 3.1 PR Description Template

```markdown
## 🎯 Description
_Briefly: what changed and why_

## 📊 Type of Changes
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 🔧 Refactor
- [ ] 📚 Documentation
- [ ] ⚡ Performance
- [ ] 🧪 Tests
- [ ] 🔒 Security
- [ ] 🗄 Database migration

## ✅ Checklist
- [ ] Code tested locally
- [ ] Build passes (`pnpm run build`)
- [ ] Linter passes (`pnpm run check`)
- [ ] Tests pass (`pnpm run test`)
- [ ] Documentation updated (API docs, README)
- [ ] No console.log in production code
- [ ] No TODOs without created issue
- [ ] Migrations created (if DB schema changed)

## 🧪 How to Test
_Step-by-step instructions for reviewer:_
1. _Run ..._
2. _Open ..._
3. _Expected result ..._

## 📸 Screenshots (if API changes)
_Example request/response_

## 🔗 Links
- Issue: LINK_TO_ISSUE
- API Docs: LINK_TO_SWAGGER_OR_GRAPHQL_PLAYGROUND
```

### 3.2 PR Requirements

**Mandatory:**
- [ ] Filled description template
- [ ] Linked issue (if applicable)
- [ ] CI checks passed
- [ ] Minimum 1 reviewer

**Recommended:**
- [ ] Linked issues
- [ ] Labels (bug, enhancement, etc.)
- [ ] Assignees
- [ ] Milestone

---

## 👀 4. Code Review Checklist

### 4.1 For Author (Before Submitting)

```markdown
- [ ] Code passes `pnpm run check`
- [ ] Code passes `pnpm run build`
- [ ] Tests pass `pnpm run test`
- [ ] No console.log in production code
- [ ] No TODOs without created issue
- [ ] Variables and functions named clearly
- [ ] Code is formatted
- [ ] No unnecessary changes (debug code, comments)
```

### 4.2 For Reviewer

#### Code Quality (NestJS)
- [ ] Code is readable and understandable
- [ ] No duplication (DRY)
- [ ] Functions are small and do one thing (SRP)
- [ ] Error handling exists (try/catch, filters)
- [ ] Logic is tested

#### Architecture (NestJS)
- [ ] Modules are properly separated
- [ ] Services don't depend on controllers
- [ ] Dependency Injection used correctly
- [ ] No circular dependencies
- [ ] Imports are sorted

#### Database (MikroORM)
- [ ] Migrations created (if schema changed)
- [ ] Entities configured correctly
- [ ] No N+1 queries problem
- [ ] Indexes added where needed

#### Tests
- [ ] Tests cover new code
- [ ] Tests pass
- [ ] Edge cases included
- [ ] Tests are understandable

#### Security
- [ ] No hardcoded secrets/API keys
- [ ] Input data validated (class-validator)
- [ ] No SQL injection risks
- [ ] Authentication/Authorization checked
- [ ] Rate limiting where needed

#### Performance
- [ ] No N+1 queries
- [ ] Caching where needed
- [ ] No unnecessary computations
- [ ] Database queries optimized

---

## 🔄 5. Process

```
┌─────────────────┐
│  1. Create      │
│     branch      │
│  git checkout   │
│  -b type/desc   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Make        │
│     changes     │
│  code + tests   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Commit      │
│  message        │
│  type(scope):   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Push +      │
│  Create PR      │
│  git push -u    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Code        │
│  Review         │
│  (response      │
│   ≤ 24 hours)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Fix         │
│  comments       │
│  (if any)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  7. Approve +   │
│  Merge          │
│  (Squash)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  8. Delete      │
│  branch         │
│  git branch -D  │
└─────────────────┘
```

### 5.1 Review Time

| Priority | Response Time |
|----------|---------------|
| 🔴 Critical (production down) | ≤ 4 hours |
| 🟡 Normal | ≤ 24 hours |
| 🟢 Low | ≤ 48 hours |

### 5.2 Merge Strategy

- `Squash and merge` — for feature branches
- `Rebase and merge` — for small changes
- `Create a merge commit` — for long-running branches

---

## 📐 6. Backend Coding Standards

### 6.1 General Principles

- **KISS** — Keep It Simple, Stupid
- **DRY** — Don't Repeat Yourself
- **SOLID** — 5 OOP principles
- **YAGNI** — You Ain't Gonna Need It

### 6.2 Naming

```typescript
// Classes, decorators — PascalCase
class UserService {}
@Injectable()

// Functions, variables — camelCase
const getUserById = () => {}
const userId = '123'

// Constants — UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3
const DATABASE_CONFIG_KEY = 'database'

// Files — kebab-case
user-service.ts
auth.controller.ts

// Tests — *.spec.ts
user-service.spec.ts
```

### 6.3 Module Structure (NestJS)

```
module-name/
├── module-name.module.ts       # Module decorator
├── module-name.controller.ts   # HTTP endpoints
├── module-name.service.ts      # Business logic
├── dto/                        # Data Transfer Objects
│   ├── create.dto.ts
│   └── update.dto.ts
├── entities/                   # GraphQL entities / TypeORM entities
│   └── entity.ts
├── guards/                     # Auth guards
└── pipes/                      # Validation pipes
```

### 6.4 Comments

```typescript
// ✅ GOOD: Explains WHY
// Using debounce to prevent excessive API calls
const debouncedSearch = debounce(search, 300);

// ❌ BAD: Explains WHAT
// Set timeout to 300ms
const timeout = 300;

/**
 * Service for managing user authentication
 * Handles login, registration, and token refresh
 */
@Injectable()
export class AuthService {}
```

### 6.5 Error Handling

```typescript
// ✅ GOOD: Specific errors
try {
  await this.userService.findById(id);
} catch (error) {
  if (error instanceof NotFoundException) {
    throw error;
  }
  this.logger.error('Failed to find user', error);
  throw new InternalServerErrorException();
}

// ❌ BAD: Ignoring errors
try { something(); } catch (e) {}
```

### 6.6 Data Validation

```typescript
// ✅ GOOD: class-validator
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(8)
  @IsNotEmpty()
  password: string;
}

// ❌ BAD: Manual validation
if (!email || !email.includes('@')) { ... }
```

---

## 🚫 7. Anti-Patterns

### 7.1 In Code

```typescript
// ❌ Large functions (> 50 lines)
// ❌ Deep nesting (> 3 levels)
// ❌ Magic numbers
const timeout = 86400000; // ❌
const DAY_IN_MS = 86400000; // ✅

// ❌ Ignoring errors
try { something(); } catch (e) {}

// ❌ Any instead of types
const data: any = {}; // ❌
interface Data { ... } // ✅

// ❌ God services (services > 500 lines)
// ❌ Circular dependencies between modules
```

### 7.2 In Database

```typescript
// ❌ N+1 queries
for (const user of users) {
  const posts = await this.postService.findByUser(user.id);
}

// ✅ Batch loading
const posts = await this.postService.findByUserIds(users.map(u => u.id));

// ❌ Missing indexes on frequently queried fields
// ❌ SELECT * instead of specific columns
```

### 7.3 In PR

```
// ❌ Large PRs (> 400 lines changed)
// ❌ PR without description
// ❌ PR without tests
// ❌ "Works on my machine"
// ❌ Ignoring comments > 48 hours
// ❌ Missing migrations
```

---

## 📊 8. Metrics

### 8.1 Targets

| Metric | Target |
|--------|--------|
| PR Size | < 400 lines |
| Review Time | < 24 hours |
| Test Coverage | > 80% |
| Build Time | < 10 minutes |
| API Response Time | < 200ms (p95) |

---

## 🔗 9. Useful Links

- [NestJS Best Practices](https://docs.nestjs.com/techniques/performance)
- [MikroORM Documentation](https://mikro-orm.io/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Google Code Review Guide](https://google.github.io/eng-practices/)
- [12 Factor App](https://12factor.net/)

---

**Version:** 1.0  
**Last Updated:** 2026-02-19
