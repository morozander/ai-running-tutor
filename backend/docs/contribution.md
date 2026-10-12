# Contribution Guide

Guidelines for contributing to this project.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Naming Conventions](#naming-conventions)
3. [Code Style](#code-style)
4. [Commit Message Standards](#commit-message-standards)
5. [Pull Request Process](#pull-request-process)
6. [Testing Requirements](#testing-requirements)

---

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm (recommended) or npm
- Docker & Docker Compose
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd nestjs-lambda-boilerplate

# Install dependencies
pnpm install

# Setup git hooks (automatic via prepare script)
# If not automatic: pnpm run prepare

# Copy environment file
cp .env.example .env

# Start database
docker-compose up -d postgres

# Run migrations
pnpm run db:migrate:up

# Start development server
pnpm run start:dev
```

### IDE Setup

**VS Code Extensions (Recommended)**:
- Biome (biomejs.biome)
- GraphQL (GraphQL.vscode-api/v1)
- GitLens (eamodio.gitlens)

**VS Code Settings**:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

---

## Naming Conventions

### Files and Folders

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `user-management/` |
| Files | kebab-case | `user.service.ts` |
| Test files | kebab-case + .spec | `user.service.spec.ts` |
| E2E tests | kebab-case + .e2e-spec | `registration.e2e-spec.ts` |

### File Suffixes

| Type | Suffix | Example |
|------|--------|---------|
| Module | `.module.ts` | `user.module.ts` |
| Service | `.service.ts` | `user.service.ts` |
| Resolver | `.resolver.ts` | `registration.resolver.ts` |
| Entity | `.entity.ts` | `user.entity.ts` |
| DTO (Input) | `.input.ts` | `register-user.input.ts` |
| DTO (Response) | `.dto.ts` | `registration-response.dto.ts` |
| Guard | `.guard.ts` | `auth.guard.ts` |
| Decorator | `.decorator.ts` | `roles.decorator.ts` |
| Command | `.command.ts` | `register-user.command.ts` |
| Query | `.query.ts` | `get-user.query.ts` |
| Config | `.config.ts` | `database.config.ts` |
| Dictionary | `.dictionary.ts` | `user.dictionary.ts` |

### Classes and Interfaces

| Type | Convention | Example |
|------|------------|---------|
| Class | PascalCase | `UserService` |
| Interface | PascalCase with I prefix (optional) | `CreateUserCommand` or `IUserRepository` |
| Enum | PascalCase | `UserRole` |
| Type | PascalCase | `CurrentUserPayload` |

### Variables and Functions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userService` |
| Functions | camelCase | `findById()` |
| Constants | SCREAMING_SNAKE_CASE | `DATABASE_CONFIG_KEY` |
| Private fields | camelCase (no underscore) | `private readonly logger` |

### Database

| Type | Convention | Example |
|------|------------|---------|
| Table names | snake_case, plural | `users`, `order_items` |
| Column names | snake_case | `created_at`, `is_email_verified` |
| Foreign keys | snake_case with _id | `user_id`, `product_id` |
| Indexes | idx_table_column | `idx_users_email` |

---

## Code Style

### General Rules

1. **Use Biome** for formatting and linting
2. **No `any` type** unless absolutely necessary (use `unknown` instead)
3. **Prefer `const`** over `let`
4. **Use explicit return types** for public methods
5. **Document public APIs** with JSDoc comments

### Import Order

Biome automatically organizes imports in this order:

1. Node.js built-ins (`node:*`)
2. External packages (`@nestjs/*`, `@mikro-orm/*`)
3. Internal aliases (`@core/*`, `@modules/*`, `@shared/*`, `@config/*`)
4. Relative imports (`./`, `../`)

### Example Code Style

```typescript
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppLogger } from '@core/logging/index.js';
import { EntityNotFoundException } from '@core/exceptions/index.js';
import { User } from './entities/user.entity.js';
import type { CreateUserCommand } from './commands/create-user.command.js';

/**
 * Service for user domain operations
 */
@Injectable()
export class UserService {
  constructor(
    private readonly em: EntityManager,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('UserService');
  }

  /**
   * Find a user by ID
   *
   * @param id - The user's unique identifier
   * @returns The user entity
   * @throws EntityNotFoundException if user not found
   */
  async findById(id: string): Promise<User> {
    const user = await this.em.findOne(User, { id, deletedAt: null });

    if (!user) {
      throw new EntityNotFoundException('User', id);
    }

    return user;
  }

  /**
   * Create a new user
   */
  async create(command: CreateUserCommand): Promise<User> {
    this.logger.debug('Creating user', { email: command.email });

    const user = User.create({
      email: command.email,
      name: command.name,
    });

    await this.em.persist(user).flush();

    this.logger.log('User created', { userId: user.id });
    return user;
  }
}
```

---

## Commit Message Standards

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Other changes (tooling, etc.) |
| `revert` | Revert a previous commit |

### Scope (Optional)

Use the module or feature name:
- `user`, `registration`, `auth`, `database`, `api/v1`

### Examples

```bash
# Feature
feat(user): add email verification endpoint

# Bug fix
fix(auth): resolve token expiration check

# Documentation
docs: update README with Docker instructions

# Refactor
refactor(registration): extract validation logic to entity

# Breaking change
feat(api)!: change user response format

BREAKING CHANGE: The user response now includes nested profile object
```

### Validation

Commit messages are validated by Lefthook on `commit-msg` hook. Invalid messages will be rejected.

---

## Pull Request Process

### Before Creating a PR

1. **Create a feature branch**
   ```bash
   git checkout -b feat/user-verification
   ```

2. **Make your changes** following the code style guidelines

3. **Run checks locally**
   ```bash
   pnpm run check      # Lint + format
   pnpm run test       # Unit tests
   pnpm run test:e2e   # Integration tests (if applicable)
   ```

4. **Commit with conventional message**
   ```bash
   git commit -m "feat(user): add email verification"
   ```

### PR Requirements

1. **Title**: Use conventional commit format
   - `feat(user): add email verification endpoint`

2. **Description**: Include:
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Screenshots (for UI changes)

3. **Checklist**:
   - [ ] Code follows project style guidelines
   - [ ] Tests added/updated for new functionality
   - [ ] Documentation updated if needed
   - [ ] No linting errors
   - [ ] All tests pass

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test
1. Step one
2. Step two

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All checks pass
```

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No unresolved conversations
4. Squash merge to main branch

---

## Testing Requirements

### Unit Tests

- **Location**: `__tests__/` folder within each module
- **Naming**: `*.spec.ts`
- **Coverage**: Aim for 80%+ on business logic

```typescript
// user.service.spec.ts
describe('UserService', () => {
  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: '123', email: 'test@example.com' };
      mockEm.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('123');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      // Arrange
      mockEm.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('123')).rejects.toThrow(EntityNotFoundException);
    });
  });
});
```

### Integration Tests

- **Location**: `test/` folder at project root
- **Naming**: `*.e2e-spec.ts`
- **Database**: Use test database (port 5433)

```typescript
// registration.e2e-spec.ts
describe('Registration (e2e)', () => {
  it('should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1')
      .send({
        query: `
          mutation {
            registerUser(input: { email: "test@example.com", name: "Test" }) {
              success
              user { id email }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.registerUser.success).toBe(true);
  });
});
```

### Running Tests

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:cov

# Integration tests
docker-compose up -d postgres-test
pnpm run test:e2e
```
