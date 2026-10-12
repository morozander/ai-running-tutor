---
name: backend-mikroorm
description: MikroORM patterns — EntityManager, transactions, soft delete, naming strategy
globs: ["backend/src/**/*.service.ts", "backend/src/**/*.entity.ts", "backend/src/core/database/**/*.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# MikroORM Patterns

## EntityManager usage

Use `EntityManager` directly. **Custom repositories are forbidden.**

```ts
@Injectable()
export class UserService {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<User> {
    // em.findOne returns User | null — handle the null; don't lie in the return type.
    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new EntityNotFoundException('User', id); // canonical pattern — see domain-services.md
    }
    return user;
  }

  async findAll(limit = 20, offset = 0): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.em.findAndCount(User, {}, {
      limit,
      offset,
      orderBy: { createdAt: 'DESC' },
    });
    return { users, total }; // the repo-wide envelope — see Pagination below
  }
}
```

## Soft delete filter

Filtering out soft-deleted entities is **non-negotiable regardless of query shape** — a flexible/parameterized read that forgets the `deletedAt` filter (and isn't covered by the global filter) is a silent data-leak bug, not a style nit.

```ts
// ✅ Explicit
await this.em.findOne(User, { id, deletedAt: null });

// ✅ Or rely on the global softDelete filter — ONLY if it's registered in the RUNTIME config
```

WHEN you rely on the global filter, verify it's registered in the options the app actually boots with — check the runtime module's MikroORM options (e.g. (THIS repo): `src/core/database/database.module.ts`, `forRootAsync`), **not just `mikro-orm.config.ts`** — that file configures the CLI (migrations/seeders), and the two configs can drift. A filter that exists only in the CLI config does nothing at runtime: soft-deleted rows come back. WHEN the runtime config has no filter, filter `deletedAt` explicitly — on EVERY read of that entity, not just some.

### Soft delete × uniqueness

WHEN a soft-deleted entity carries a uniqueness rule → a bare `unique: true` is a bug signal: the soft-deleted row still occupies the constraint, so the user can never re-create what they deleted. Use a **partial unique index** filtered to live rows, declared at the entity level so migrations pick it up:

```ts
@Index({
  name: 'users_email_unique_active',
  expression: `create unique index "users_email_unique_active" on "users" ("email") where "deleted_at" is null`,
})
```

The signal in review: an entity extends `BaseEntity` (has `deletedAt`) AND declares `unique: true` or `@Unique()` → flag it.

## Relations: populate what's selected, never lazy-load in a loop (N+1)

The everyday "read shape gone wrong" in MikroORM is the N+1, not exotic column selection:

- **Populate the relations the consumer actually needs** — driven by what the GraphQL selection set / caller reads. Don't blanket-`populate` the whole object graph "just in case" (over-fetch), and don't leave a needed relation lazy so it's loaded one-row-at-a-time.
- **Never lazy-load a relation inside a loop** — that's the N+1 trap. Populate up front (`populate: ['relation']`) or batch it.
- The decision is per-read: *does the consumer use this relation?* → populate it; *only some consumers do?* → make it a parameter, don't force it on all.

## Partial loading — `fields` driven by the GraphQL selection

`em.find`/`findAndCount` accept a `fields` option to return ONLY specific columns. For a **consumer-driven query** (the frontend selects what the layout needs), derive `fields` (and which relations to `populate`) from the GraphQL selection set rather than hand-picking per query — see the read-shape section in [domain-services.md](./domain-services.md) for WHEN this is worth it and the whitelist/soft-delete/auth guardrails. For an ordinary read whose single consumer takes a fixed small set of columns, a plain `em.find` returning the whole row is fine — don't add selection plumbing without a varying-consumer need.

## Pagination: paginate collections that can grow

A list that can grow unbounded **needs pagination** (limit/offset like `findAndCount`, or cursor); a small, bounded reference set (e.g. a fixed enum-like lookup) may return all rows. The signal: *can this collection grow with normal usage?* If yes, paginate from the start — don't ship an unpaginated `find`/`findAll` of a growing table and discover the scaling cliff later.

**Response contract: ONE envelope shape per repo.** Paginated reads return an object envelope with a named collection plus `total` — e.g. (THIS repo): `{ users, total }`, matching the real `UserService.findAll` — never a bare array, a tuple, or a per-query invented shape. Every new shape churns the FE/mobile codegen contract (see [graphql.md](./graphql.md) selection-set rule). New paginated queries use the envelope; existing shapes are grandfathered until next touched.

**Offset vs cursor:**

- **WHEN it's an admin/small list with page numbers** → limit/offset is simpler and fine.
- **WHEN the list grows unboundedly, or rows are inserted while users page** (feeds, infinite scroll) → cursor pagination; offset paging over a mutating list produces duplicates/skips.
- The signal: *will inserts during paging cause duplicates or skips the user will notice?*

## Transactions (feature modules only)

The consistency-boundary decision:

- **WHEN one mutation changes ≥2 entities whose invariants must hold together** → wrap in `em.transactional` (the `transferFunds` shape below).
- **WHEN it's a single aggregate** → one unit-of-work flush (`persistAndFlush`) is already atomic — a transaction wrapper is ceremony.
- **WHEN the mutation mixes an external call (Cognito, SendGrid, S3) with a DB write** → the external system is OUTSIDE your transaction. Never hold a transaction open across an external await; order the steps for crash-safety — commit the DB then send (or record intent first and reconcile / outbox). The signal: *what state are you left in if the process dies between step N and N+1?*

```ts
async transferFunds(fromId: string, toId: string, amount: number) {
  await this.em.transactional(async (em) => {
    const from = await em.findOneOrFail(Account, fromId);
    const to   = await em.findOneOrFail(Account, toId);

    from.withdraw(amount);  // domain method on entity
    to.deposit(amount);     // domain method on entity

    // auto-flush at end of transaction
  });
}
```

## Constraint violations → domain errors at flush

The friendly pre-check (`isEmailTaken`-style, see [feature-modules.md](./feature-modules.md)) stays — but it's racy; **the DB constraint is the source of truth**. WHEN a write carries a uniqueness (or exclusion) constraint → wrap the flush in a translator keyed on **SQLSTATE + constraint NAME** that rethrows a domain exception with a stable code; rethrow everything unmatched so unknown errors still surface. A raw `DriverException` must never reach the client.

```ts
try {
  await this.em.persistAndFlush(user);
} catch (e) {
  if (e instanceof UniqueConstraintViolationException && /users_email_unique/.test(String(e))) {
    throw new EntityAlreadyExistsException('User', input.email); // stable code, friendly message
  }
  throw e; // unmatched errors surface — never swallow
}
```

Trap: Postgres **exclusion** constraints surface as SQLSTATE `23P01`, NOT as `UniqueConstraintViolationException` — match on SQLSTATE + constraint name from the driver error, not the ORM class alone.

## EM context outside HTTP

The request-scoped EM context comes from middleware that only fires on HTTP requests. WHEN MikroORM code runs where no HTTP middleware fires — a cron tick, a queue-worker invocation, any standalone entrypoint → open a fresh context **per execution**: `@CreateRequestContext()` (with the MikroORM instance injected) or `em.fork()`. Sharing the global EM across ticks means a stale identity map and state leaking between runs. (THIS repo): every queue-worker and cron Lambda handler needs its own per-invocation context — see [background-work.md](./background-work.md).

## Naming strategy

`UnderscoreNamingStrategy` is configured globally — `camelCase` → `snake_case`. Don't add explicit column names.

```ts
@Property()
lastLoginAt?: Date;  // → last_login_at

// ❌ Redundant
@Property({ name: 'last_login_at' })
```

## Driver import

Always specify driver in module config (required for proper imports):

```ts
MikroOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  driver: PostgreSqlDriver,
  useFactory: (config) => ({ ... }),
});
```

## Migrations

Generated under the dir set in `mikro-orm.config.ts` (`migrations.path`) — e.g. (THIS repo): `backend/src/core/database/migrations/`. Use the migration scripts defined in `backend/package.json` — e.g. (THIS repo):

```bash
pnpm db:migrate:create   # diff schema → new migration file
pnpm db:migrate:up       # apply pending migrations
pnpm db:migrate:down     # roll back one
```

Never edit applied migrations. If a change is needed, create a new one that corrects it. Full workflow: [migrations.md](./migrations.md).
