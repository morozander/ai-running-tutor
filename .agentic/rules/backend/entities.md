---
name: backend-entities
description: Rich Domain Model — factory methods, validation, business logic in entities
globs: ["backend/src/**/*.entity.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Entity Patterns

Business logic lives **inside entities**, not services.

## Rich Domain Model

```ts
@ObjectType()
@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Field()
  @Property({ unique: true })
  email!: string;

  // Factory method for creation
  static create(params: { id: string; email: string; firstName: string }): User {
    const normalizedEmail = params.email.toLowerCase().trim();
    User.validateEmail(normalizedEmail);

    const user = new User();
    user.id = params.id;
    user.email = normalizedEmail;
    return user;
  }

  // Domain method for state changes
  changeEmail(newEmail: string): void {
    const normalized = newEmail.toLowerCase().trim();
    User.validateEmail(normalized);
    this.email = normalized;
  }

  private static validateEmail(email: string): void {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new DomainValidationException(`Invalid email: ${email}`);
    }
  }
}
```

## Required patterns

1. **Extend `BaseEntity`** — provides `id`, `createdAt`, `updatedAt`, `deletedAt`
2. **Use a factory method (`Entity.create({...})`) WHEN the entity has an invariant to enforce** — validation, a normalization that a uniqueness/format rule depends on, or a cross-field rule. The factory exists to GUARANTEE those invariants can't be skipped. For **invariant-free trivial CRUD** (a create that is pure field assignment with nothing to validate), plain assignment is fine — don't wrap it in an empty factory as ceremony. The signal: *is there a rule the entity must guarantee at construction?* If yes → factory; if it's just copying fields → assignment.
3. **Normalize before validate** — trim / lowercase before checking format. (A normalization only justifies a factory when a downstream invariant/uniqueness rule depends on it; a stray trim with no rule behind it does not by itself require one.)
4. **Throw domain exceptions** — `DomainValidationException`, `BusinessRuleViolationException`, never `Error` or generic NestJS exceptions
5. **Combine decorators** — `@ObjectType()` + `@Entity()` on the same class (code-first GraphQL)

## Naming strategy

`UnderscoreNamingStrategy` is configured globally — `camelCase` properties auto-convert to `snake_case` columns:

```ts
@Property()
lastLoginAt?: Date;  // → column: last_login_at

// ❌ Unnecessary explicit column name
@Property({ name: 'last_login_at' })
```

## Anti-patterns

- ❌ Putting validation in services — entities own their invariants (and don't duplicate the SAME invariant check across multiple feature services — it belongs on the entity)
- ❌ Public mutator methods that bypass validation — always validate
- ❌ `new Entity()` to BYPASS an invariant the entity defines — go through the factory/domain method so validation can't be skipped (for an invariant-free entity, a plain assignment is acceptable — don't add an empty factory just to have one)
- ❌ Forgetting `@Field()` — column exists but isn't exposed in GraphQL
