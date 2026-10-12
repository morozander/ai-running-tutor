# Architecture Philosophy

This document explains the architectural principles and patterns used in this boilerplate.

## Table of Contents

1. [Hexagonal Architecture Overview](#hexagonal-architecture-overview)
2. [Domain vs Feature Modules](#domain-vs-feature-modules)
3. [When to Use Direct Injection](#when-to-use-direct-injection)
4. [When to Use CQRS](#when-to-use-cqrs)
5. [Rich Domain Model](#rich-domain-model)
6. [Lambda Optimization Strategies](#lambda-optimization-strategies)

---

## Hexagonal Architecture Overview

This project implements a simplified Hexagonal (Ports & Adapters) architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     FEATURE MODULES                          │
│  (Resolvers, Feature Services, DTOs)                        │
│  - Orchestrate use cases                                     │
│  - Handle HTTP/GraphQL concerns                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ imports / CQRS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN MODULES                           │
│  (Entities, Domain Services, Repositories)                   │
│  - Business logic                                            │
│  - Domain rules                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CORE / INFRASTRUCTURE                    │
│  (Database, Auth, Logging, AWS Services)                     │
│  - Technical concerns                                        │
│  - External integrations                                     │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Contains | Depends On |
|-------|----------|------------|
| **Feature** | Resolvers, Feature Services, DTOs, CQRS Commands, Feature-specific Queries | Domain, Core (all) |
| **Domain** | Entities, Domain Services, Reusable CQRS Queries | Core (database, exceptions, logging only) |
| **Core** | Database, Auth, Logging, AWS | External libraries |

### Core Dependency Rules (Critical)

Domain modules have **restricted access** to Core:

```
┌─────────────────────────────────────────────────────────────┐
│                        CORE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  ALLOWED FOR    │    │  FEATURE MODULES ONLY           │ │
│  │  DOMAIN MODULES │    │  (NOT for Domain)               │ │
│  ├─────────────────┤    ├─────────────────────────────────┤ │
│  │ • Database      │    │ • Auth (Cognito, Guards)        │ │
│  │ • Exceptions    │    │ • AWS (Bedrock, SES, S3)        │ │
│  │ • Logging       │    │ • GraphQL                       │ │
│  │                 │    │ • External APIs                 │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│         ▲                          ▲                         │
│         │                          │                         │
│    Domain Modules             Feature Modules                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why this restriction?**

1. **Domain purity**: Domain logic should not depend on infrastructure details like "how we send emails" or "which AI provider we use"
2. **Testability**: Domain modules can be tested without mocking Cognito, Bedrock, etc.
3. **Flexibility**: You can swap Cognito for Auth0, or Bedrock for OpenAI, without touching domain code
4. **Single Responsibility**: Domain handles business rules; Features handle integration

**Allowed in Domain modules:**
- `@core/database/*` - EntityManager, MikroORM
- `@core/exceptions/*` - DomainException, EntityNotFoundException, etc.
- `@core/logging/*` - AppLogger (for debugging)

**NOT allowed in Domain modules:**
- `@core/auth/*` - Cognito, Guards, Decorators
- `@core/aws/*` - Bedrock, SES, S3
- `@core/graphql/*` - GraphQL decorators (use in entities is OK, but not GraphQL module)

---

## Domain vs Feature Modules

### Domain Modules (`/src/modules/domain/`)

Domain modules are the **heart of your business logic**. They contain:

- **Entities**: Data structures with embedded business rules
- **Domain Services**: **Read-only** operations (find, list, check existence)
- **CQRS Query Handlers**: Read operations exposed to other modules

**Key Rules**:
1. Domain modules MUST NOT import other domain modules
2. Domain modules MUST NOT know about HTTP/GraphQL
3. Domain modules MUST NOT depend on high-level infrastructure (Auth, AWS services, Mailers)
4. Domain modules CAN ONLY use: Database (EntityManager), Exceptions, Logging from Core
5. Business logic MUST live in entities, not services
6. **Domain services are READ-ONLY** - no create/update/delete operations

**Example Structure**:
```
modules/domain/user/
├── entities/
│   └── user.entity.ts      # Entity with business logic
├── services/
│   └── user.service.ts     # READ-ONLY domain operations
├── queries/
│   └── get-user.query.ts   # CQRS query handler
└── user.module.ts
```

### Feature Modules (`/src/modules/features/`)

Feature modules **orchestrate use cases** and **handle all mutations**. They contain:

- **Resolvers**: GraphQL entry points
- **CQRS Command Handlers**: **All write operations live here**
- **DTOs**: Input/Output types for the API

**Key Rules**:
1. Feature modules CAN import domain modules directly
2. Feature modules CAN use ALL Core services (Auth, AWS, GraphQL, etc.)
3. Feature modules SHOULD use CQRS for cross-feature communication (or DI)
4. Feature modules handle all API concerns (validation, transformation)
5. Feature modules orchestrate external integrations (email, AI, notifications)
6. **All mutations (create/update/delete) happen in feature command handlers**

**Example Structure**:
```
modules/features/registration/
├── dto/
│   ├── register-user.input.ts
│   └── registration-response.dto.ts
├── commands/
│   └── register-user.command.ts  # CQRS command + handler
├── services/
│   └── registration.service.ts
├── resolvers/
│   └── registration.resolver.ts
└── registration.module.ts
```

### Where Do Mutations Live?

Mutations are handled in **Feature modules**. You have two options:

#### Option A: Simple Approach (No CQRS) - Recommended for most projects

Use a feature service with `EntityManager` directly:

```typescript
// src/modules/features/registration/services/registration.service.ts
@Injectable()
export class RegistrationService {
  constructor(
    private readonly em: EntityManager,        // Direct EntityManager for writes
    private readonly userService: UserService, // Domain service for reads
  ) {}

  async registerUser(input: RegisterUserInput): Promise<User> {
    // 1. Use domain service for read operations
    if (await this.userService.isEmailTaken(input.email)) {
      throw new EntityAlreadyExistsException('User', input.email);
    }

    // 2. Use entity factory for creation
    const user = User.create({
      email: input.email,
      name: input.name,
    });

    // 3. Use EntityManager for persistence
    await this.em.persistAndFlush(user);

    return user;
  }
}

// src/modules/features/registration/resolvers/registration.resolver.ts
@Resolver()
export class RegistrationResolver {
  constructor(private readonly registrationService: RegistrationService) {}

  @Mutation(() => User)
  async registerUser(@Args('input') input: RegisterUserInput): Promise<User> {
    return this.registrationService.registerUser(input);
  }
}
```

**Module setup (no CqrsModule needed):**

```typescript
// src/modules/features/registration/registration.module.ts
@Module({
  imports: [UserModule],  // Import domain module
  providers: [RegistrationService, RegistrationResolver],
})
export class RegistrationModule {}
```

#### Option B: CQRS Approach - For large/enterprise projects

Use Command Handlers when you need cross-feature communication or audit trails:

```typescript
// src/modules/features/registration/commands/register-user.command.ts
@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly em: EntityManager,
    private readonly userService: UserService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    if (await this.userService.isEmailTaken(command.email)) {
      throw new EntityAlreadyExistsException('User', command.email);
    }

    const user = User.create({
      email: command.email,
      name: command.name,
    });

    await this.em.persistAndFlush(user);
    return user;
  }
}
```

**When to use which?**

| Approach | Use When |
|----------|----------|
| **Simple (Service)** | Small/medium projects, single team, straightforward flows |
| **CQRS (Commands)** | Large projects, multiple teams, cross-feature communication, audit needs |

**Why this pattern (both approaches)?**

1. **Transaction control**: Feature modules can wrap multiple operations in transactions
2. **Orchestration**: Features can coordinate multiple domain entities
3. **Testability**: Domain services remain pure and easy to test
4. **Flexibility**: Different features can persist entities differently (batch, transaction, etc.)

---

## When to Use Direct Injection

**Use direct injection when**:

1. **Feature → Domain**: A feature module needs a domain service
2. **Same module**: Components within the same module
3. **Simple read operations**: When CQRS overhead isn't justified

In other words it is better to stay with this approach for small projects where everyone confident in dependencies.

**Example**:
```typescript
// registration.module.ts
@Module({
  imports: [UserModule],  // Direct import
  providers: [RegistrationService],
})
export class RegistrationModule {}

// registration.service.ts
@Injectable()
export class RegistrationService {
  constructor(
    private readonly userService: UserService,  // Direct injection
  ) {}
}
```

---

## When to Use CQRS

**Use CQRS when**:

1. **Cross-domain communication**: Domain A needs data from Domain B
2. **Cross-feature communication**: Feature A triggers action in Feature B
3. **Decoupling is important**: You want to change implementations independently
4. **Audit/logging**: You need to track all commands

Shortly: for huge, enterprise projects.

### Commands vs Queries

| Aspect | Command | Query |
|--------|---------|-------|
| Purpose | Change state | Read state |
| Return | Result of operation | Data |
| Side effects | Yes | No |
| Location | Feature modules | Domain **or** Feature modules (see below) |

### Where Do Queries Live?

Queries are not exclusively a domain concept. The rule is:

- **Put a query in a Domain module** when the same read operation is reused across **multiple feature modules**. For example, `GetUserQuery` is used by auth, dashboard, and task features — it belongs in `UserModule`.
- **Put a query in a Feature module** when the read is **specific to one feature** and has no reason to be shared. For example, a complex dashboard aggregation query that only the dashboard feature needs can live inside `DashboardModule` directly.

In practice, for small to medium projects you'll rarely need CQRS queries at all — a domain service method (e.g. `userService.findById()`) called directly via dependency injection is simpler and equally valid. Use CQRS queries only when you need to decouple modules that can't directly import each other.

**Command Example** (Feature module):
```typescript
// RegisterUserCommand - changes state
export class RegisterUserCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
  ) {}
}

// Usage
const user = await this.commandBus.execute(
  new RegisterUserCommand(email, name)
);
```

**Query Example** (Domain module):
```typescript
// GetUserQuery - reads state
export class GetUserQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

// Usage
const user = await this.queryBus.execute(
  new GetUserQuery(userId)
);
```

### Decision Flowchart

```
Need to access another module?
│
├─► Same feature module? ──► Direct injection
│
├─► Feature → Domain? ──► Direct injection (import module)
│
├─► Domain → Domain? ──► CQRS Query (in domain module)
│
├─► Feature → Feature? ──► CQRS Command (or direct injection if modules are related)
│
└─► Unsure? ──► Start with direct injection, refactor to CQRS if needed

Need a read operation inside a single feature?
│
├─► Reused across multiple features? ──► CQRS Query in Domain module
│
└─► Used only in this feature? ──► Direct service call or CQRS Query in Feature module
```

---

## Rich Domain Model

### What is a Rich Domain Model?

A Rich Domain Model places business logic **inside entities**, not in services. Entities are not just data containers; they enforce business rules.

### Anemic vs Rich Domain Model

**Anemic (Bad)**:
```typescript
// Entity is just data
class User {
  email: string;
  isVerified: boolean;
}

// Service has all logic
class UserService {
  verifyEmail(user: User) {
    if (user.isVerified) {
      throw new Error('Already verified');
    }
    user.isVerified = true;
    // save...
  }
}
```

**Rich (Good)**:
```typescript
// Entity has logic
class User {
  email: string;
  isVerified: boolean;

  verifyEmail(): void {
    if (this.isVerified) {
      throw new BusinessRuleViolationException('Already verified');
    }
    this.isVerified = true;
  }
}

// Service orchestrates
class UserService {
  async verifyUserEmail(userId: string): Promise<void> {
    const user = await this.findById(userId);
    user.verifyEmail();  // Entity enforces rules
    await this.em.flush();
  }
}
```

### Benefits

1. **Consistency**: Business rules are always enforced
2. **Discoverability**: Logic is where you expect it
3. **Testing**: Entity logic can be unit tested without mocks
4. **Encapsulation**: Internal state is protected

### Guidelines

1. Use **factory methods** for creation: `User.create({ email, name })`
2. Use **domain methods** for state changes: `user.verifyEmail()`
3. Throw **domain exceptions** for rule violations
4. Keep entities **framework-agnostic** where possible

---

## Lambda Optimization Strategies

### 1. Lazy Imports

Import heavy dependencies only when needed:

```typescript
// Bad: Always loaded
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// Good: Loaded on demand
async invoke() {
  const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
}
```

### 2. Minimal Connection Pool

```typescript
// mikro-orm.config.ts
pool: {
  min: 0,  // No idle connections
  max: 10, // Scale as needed
}
```

### 3. No EventEmitter

Use synchronous CQRS instead of async events:

```typescript
// Bad: Async event (doesn't complete before Lambda ends)
this.eventEmitter.emit('user.created', user);

// Good: Sync command (completes before response)
await this.commandBus.execute(new SendWelcomeEmailCommand(user.id));
```

### 4. Cached Configuration

```typescript
// app.module.ts
ConfigModule.forRoot({
  cache: true,  // Cache parsed config
})
```

### 5. Disable Unnecessary Features

```typescript
// graphql.module.ts
GraphQLModule.forRoot({
  subscriptions: false,  // Not supported in Lambda
  playground: process.env.NODE_ENV !== 'production',
})
```

---

## Summary

| Principle | Implementation |
|-----------|----------------|
| Separation of Concerns | Domain vs Feature modules |
| Loose Coupling | CQRS for cross-module communication |
| Business Logic Location | Rich Domain Model in entities |
| Lambda Optimization | Lazy imports, sync operations, minimal pool |
| Type Safety | MikroORM, GraphQL code-first |
