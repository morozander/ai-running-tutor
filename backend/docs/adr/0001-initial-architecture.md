# ADR 0001: Initial Architecture

**Status**: Accepted  
**Date**: 2024-01-01  
**Decision Makers**: Architecture Team

## Context

We need to build a scalable, maintainable NestJS backend that:

1. Runs efficiently on AWS Lambda (cold start optimization)
2. Supports complex business logic with clear boundaries
3. Enables team scalability with independent module development
4. Provides type-safe database operations
5. Exposes a GraphQL API

## Decision

### 1. Vertical Slice / Modular Monolith Architecture

**Choice**: Separate Domain modules from Feature modules

**Rationale**:
- **Domain modules** contain entities, business logic, and data access. They are the "what" of the system.
- **Feature modules** orchestrate use cases and expose APIs. They are the "how" of the system.
- This separation allows domain logic to be reused across features while keeping use-case logic isolated.

**Dependency Rules**:
- Domain modules may ONLY depend on: Database (persistence), Exceptions, Logging from Core
- Domain modules MUST NOT depend on: Auth (Cognito), AWS services (Bedrock, SES), GraphQL module, or any external integration
- Feature modules may depend on: Domain modules + ALL Core services
- This keeps domain logic pure and infrastructure-agnostic

**Alternatives Considered**:
- **Traditional layered architecture**: Rejected because it leads to anemic domain models and scattered business logic.
- **Full microservices**: Rejected due to operational complexity for the current team size.

### 2. CQRS for Cross-Module Communication

**Choice**: Use `@nestjs/cqrs` with synchronous Command/Query Bus

**Rationale**:
- Domain modules MUST NOT import each other directly to prevent circular dependencies.
- CQRS provides a clean contract for cross-module communication.
- Synchronous execution is Lambda-friendly (no EventEmitter, no background jobs).
- Commands represent intent; Queries represent data retrieval.

**Alternatives Considered**:
- **Direct service injection**: Rejected because it creates tight coupling between domains.
- **Event-driven with EventEmitter**: Rejected because async events don't work well with Lambda's execution model.
- **Message queues (SQS)**: Considered for future use but adds complexity for simple use cases.

### 3. MikroORM v6+ as ORM

**Choice**: MikroORM with PostgreSQL

**Rationale**:
- Excellent TypeScript support with proper type inference
- Unit of Work pattern for efficient database operations
- Built-in support for soft deletes, migrations, and seeding
- EntityRepository pattern without requiring custom repositories for simple cases
- Better cold start performance than TypeORM

**Alternatives Considered**:
- **TypeORM**: Rejected due to maintenance concerns and weaker TypeScript support.
- **Prisma**: Rejected because it generates a client that increases bundle size.
- **Drizzle**: Considered but MikroORM's entity-based approach fits better with DDD.

### 4. Rich Domain Model

**Choice**: Business logic lives inside entities

**Rationale**:
- Entities are not just data containers; they enforce business rules.
- Factory methods (`User.create()`) ensure valid object creation.
- Domain methods (`user.verifyEmail()`) encapsulate state transitions.
- This prevents "anemic domain model" anti-pattern.

**Example**:
```typescript
// Good: Logic in entity
const user = User.create({ email, name });
user.verifyEmail();

// Bad: Logic in service
const user = new User();
user.email = email;
user.name = name;
userService.validateAndSave(user);
```

### 5. GraphQL Code-First with Combined Decorators

**Choice**: Use `@ObjectType` and `@Entity` on the same class

**Rationale**:
- Reduces code duplication between GraphQL types and database entities.
- Single source of truth for data structure.
- Faster development with less boilerplate.

**Trade-offs**:
- Less flexibility for complex GraphQL schemas that differ from DB schema.
- Mitigation: Use separate DTOs when GraphQL shape differs significantly.

### 6. Biome + Lefthook for Tooling

**Choice**: Replace ESLint + Prettier with Biome; use Lefthook for git hooks

**Rationale**:
- Biome is 10-15x faster than ESLint + Prettier combined.
- Single tool for linting and formatting reduces configuration complexity.
- Lefthook is faster and simpler than Husky + lint-staged.
- Better developer experience with near-instant feedback.

**Alternatives Considered**:
- **ESLint + Prettier**: Rejected due to performance and configuration complexity.
- **Husky + lint-staged**: Rejected in favor of Lefthook's simpler configuration.

### 7. Structured Logging for CloudWatch

**Choice**: JSON-formatted logs with correlation IDs

**Rationale**:
- CloudWatch Logs Insights works best with structured JSON.
- Correlation IDs enable request tracing across Lambda invocations.
- Log levels can be configured per environment.

## Consequences

### Positive

- Clear separation of concerns enables parallel team development
- CQRS provides explicit contracts between modules
- Rich domain model catches business rule violations early
- Fast tooling improves developer productivity
- Lambda-optimized patterns reduce cold start times

### Negative

- Learning curve for developers unfamiliar with CQRS
- More files/folders than traditional NestJS structure
- Combined entity/GraphQL types may need refactoring for complex cases

### Risks

- CQRS overhead for simple CRUD operations (mitigated by allowing direct injection within features)
- MikroORM is less popular than TypeORM (mitigated by excellent documentation)

## References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [CQRS Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [MikroORM Documentation](https://mikro-orm.io/docs)
- [Biome Documentation](https://biomejs.dev/)
