---
name: typescript
description: TypeScript conventions across backend, frontend, mobile
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# TypeScript Conventions

## `type` vs `interface`

**Prefer `type` for object shapes.** Use `interface` only when one of:

- Declaration merging is required (e.g., extending `@mui/material/styles` Palette, Window globals)
- Implementing a class contract (e.g., NestJS `CanActivate`, `PipeTransform`, `NestInterceptor`)
- Extending an interface from a third-party library that uses `interface`

```ts
// ✅ Default — type
type UserProps = {
  id: string;
  email: string;
};

// ✅ Acceptable — class contract
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean { ... }
}

// ✅ Acceptable — module augmentation
declare module '@mui/material/styles' {
  interface Palette {
    brand: BrandColor;
  }
}
```

## Property ordering

Within `type` / `interface` bodies, order properties shortest-name-to-longest. Handler functions go last regardless of name length.

```ts
type ButtonProps = {
  id: string;
  size: ButtonSize;
  variant: ButtonVariant;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
};
```

Required vs optional are interleaved by name length; do not split them into separate groups.

## No `any`

Use `unknown` and narrow with type guards.

```ts
// ✅
try { doThing(); }
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
}

// ❌
catch (error: any) { console.log(error.message); }
```

If you absolutely must reach for `any`, add a `// reason:` comment explaining why. The only generally-accepted use case is narrowing AxiosError-style responses where the error shape is genuinely opaque.

## `import type` for type-only imports

```ts
import type { User } from './types';
import { useState } from 'react';
```

Required when `tsconfig.json` has `verbatimModuleSyntax: true` (frontend) or recommended otherwise.

## Explicit return types on public methods

```ts
// ✅
async findUser(id: string): Promise<User> { ... }

// ❌ — inferred is fine for private/internal helpers, not for service methods
async findUser(id: string) { ... }
```

## Prefer `const` over `let`

Reach for `let` only when reassignment is genuinely needed (loop counters, accumulators).

## Strict compiler options

Every tsconfig has at minimum:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

`noUncheckedIndexedAccess: true` is preferred on backend and frontend; if absent, indexed access must be explicitly checked.

## Enum alternatives

Prefer `as const` objects with derived union types over TypeScript `enum`:

```ts
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
```

Exceptions — the signal is: *is the enum part of the GraphQL schema?*

- **Backend code-first GraphQL enums** are legitimate `enum`s: the schema needs a runtime object passed to `registerEnumType`, and TS `enum` is the established pattern here — e.g. (THIS repo): `enum UserRole` + `registerEnumType(UserRole, ...)` in `user.entity.ts`. Don't convert these to `as const`.
- **Generated GraphQL enums** (from codegen) — use them as-is.

The `as const` preference applies to everything that is NOT part of the GraphQL schema.

## Suppression comments

`@ts-ignore`, `@ts-expect-error`, and `eslint-disable` lines without a `reason:` justification are forbidden. Fix the root cause instead.
