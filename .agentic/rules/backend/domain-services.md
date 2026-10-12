---
name: backend-domain-services
description: Domain service patterns — READ-ONLY operations only, no mutations
globs: ["backend/src/modules/domain/**/*.service.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Domain Services

Domain services perform **only read operations**. All mutations happen in feature modules.

## Correct pattern

```ts
@Injectable()
export class UserService {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<User> {
    const user = await this.em.findOne(User, { id });
    if (!user) throw new EntityNotFoundException('User', id);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, { email: email.toLowerCase() });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    return (await this.em.count(User, { email: email.toLowerCase() })) > 0;
  }
}
```

## Anti-pattern

```ts
// ❌ Mutation in a domain service
@Injectable()
export class UserService {
  async createUser(data: CreateUserDto): Promise<User> {
    const user = User.create(data);
    await this.em.persistAndFlush(user); // ← belongs in a feature module
    return user;
  }
}
```

## Allowed EntityManager operations

- `findOne`, `find`, `findAndCount`
- `count`
- Existence checks
- Any read-only queries

## Forbidden operations

- `persist`, `persistAndFlush`
- `remove`, `removeAndFlush`
- `flush`
- Any state-changing call

## Read-access shape — parameterize ONE query, or give the read its own method?

Most reads are obvious trivial CRUD — don't overthink them. The decision only matters when you're choosing between adding another finder vs reusing one. Use the signal, and do NOT over-build:

- **Parameterize an existing query** WHEN the only thing that differs between two candidate finders is their `where` / `order` / `limit` / pagination — that variation belongs in *arguments*, not a new method. A growing pile of near-duplicate finders that differ only by filter (`findActiveX`, `findRecentX`, `findXByStatus`) is the under-applied smell — fold them into one parameterized read.
- **Give the read its own named method** WHEN it carries distinct semantics: authorization scoping, a computed / derived / cross-aggregate result, an existence check, or bespoke not-found behavior. `findById`-that-throws, `isEmailTaken`, `findByEmail` are legitimately separate — keep them.
- **A read that must be authorization-scoped** takes the current user / scope as a **parameter passed in from the resolver or feature layer** — a domain service must NOT import `@core/auth` (see [architecture.md](./architecture.md) layering). Thread `currentUserId`/scope as an argument; never inject the auth context into a domain service.
### Consumer-driven "smart" query — the frontend selects, the backend adapts (valid, often preferred)

For a read with **no extra business logic**, you can — and for list/detail reads with varying needs you SHOULD — expose ONE flexible query the frontend drives, instead of many bespoke finders. This is exactly *"one query the frontend uses"* rather than N small ones, with nothing hand-handled per field:

- **Field selection:** read the GraphQL selection set (NestJS `@Info()` + a `graphql-fields`-style helper) and pass it to MikroORM's `fields` option so the DB returns only the columns the layout actually requested — don't hand-pick columns per query. (Relations the selection touches → `populate` them, per [mikroorm.md](./mikroorm.md); don't blanket-populate.)
- **Filtering / sorting / pagination:** accept `filter` / `sort` / `pagination` input args and translate them generically to MikroORM `where` / `orderBy` / `limit`+`offset` — don't write a new finder per filter combination.
- The resolver stays logic-free; the ORM does the work from the request.

**WHEN to use this vs a plain `em.find`:** reach for the smart query WHEN consumers genuinely vary what they select / filter / sort / paginate (multiple layouts, a user-filterable list). Keep a plain `em.find` returning the whole row WHEN there's a single consumer reading a fixed, small field set with no dynamic params — wiring `@Info` field-extraction there is ceremony with no payoff. Match the shape to the read: over-applying it is as much a defect as N duplicate finders, and under-applying it (a pile of near-duplicate finders) is the smell above.

**Guardrails for the smart query (non-negotiable):**
- **Whitelist** which fields are filterable / sortable — never translate an arbitrary client field name straight into `where`/`orderBy` (that risks data leaks and injection). Validate the `filter`/`sort` inputs against an allow-list.
- Always keep the **soft-delete filter** (see [mikroorm.md](./mikroorm.md)) regardless of the dynamic `where`.
- Apply **auth scoping at the resolver** and thread the user/scope in as a parameter (domain services don't import `@core/auth`).
