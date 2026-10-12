---
name: frontend-architecture
description: Frontend folder structure, path alias, barrel exports, feature isolation
globs: ["frontend/src/**/*.ts", "frontend/src/**/*.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Frontend Architecture

## Folder structure

```
frontend/src/
├── app/                       # Bootstrap only: app.tsx, providers.tsx, router.tsx
├── shared/
│   ├── config/                # Routes, env, role-permissions, label maps
│   ├── hooks/                 # Cross-feature hooks (use-user-role, use-mobile, ...)
│   ├── lib/                   # Pure utilities (cn(), jwt, file-utils)
│   ├── types/                 # Domain types (user.ts, ...)
│   └── ui/                    # Design-system primitives (button, dialog, input, ...)
├── components/                # Composite shared components built from shared/ui
│   ├── data-table/
│   ├── error-boundary/
│   ├── form/                  # FormProvider wrappers + FormField/FormItem/FormLabel
│   └── ...
├── features/                  # One folder per domain feature, fully self-contained
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   └── index.ts           # Public API — named re-exports only
│   └── ...
├── pages/                     # Thin route components importing from features/
│   ├── classes/classes.tsx
│   ├── auth/sign-in/sign-in.tsx
│   └── layout.tsx
├── graphql/
│   ├── client.ts              # ApolloClient factory (link chain)
│   ├── generated/             # codegen output: graphql.ts, gql.ts, index.ts
│   ├── queries/               # Tagged gql operations per domain
│   └── mutations/
└── assets/
```

## Layering rules

| Layer | Imports allowed from |
|---|---|
| `app/` | `shared/`, `pages/`, `graphql/` |
| `pages/` | `features/`, `components/`, `shared/`, `graphql/` |
| `features/<X>/` | `shared/`, `components/`, `graphql/`. **Never** from another feature directly — import via barrel. |
| `components/` | `shared/`, `graphql/` |
| `shared/ui/` | nothing project-internal (must be self-contained) |
| `shared/lib/`, `shared/hooks/`, `shared/types/` | each other, never features |

## Feature isolation

Each feature exposes its public API through `features/<name>/index.ts`. **Other modules import only from this barrel:**

```ts
// ✅ src/pages/classes/classes.tsx
import { ClassesList, useClasses } from '@/features/classes';

// ❌ Reaching into internals
import { useClasses } from '@/features/classes/hooks/use-classes';
```

The barrel is the only stable surface; everything else is implementation detail.

## Path alias

`@/` resolves to `frontend/src/`. Configured in `vite.config.ts` and `tsconfig.json`.

```ts
// ✅
import { Button } from '@/shared/ui/button';

// ❌ Cross-folder relative imports
import { Button } from '../../../shared/ui/button';
```

Same-folder relative imports (`./helpers`, `../schemas`) are fine.

## Pages are thin

A page component wires features together. **No business logic.** No data hooks beyond reading what a feature exposes.

```tsx
// ✅
export function ClassesPage() {
  return <ClassesList />;
}

// ❌ — data fetching belongs in the feature hook
export function ClassesPage() {
  const { data } = useQuery(GET_CLASSES);
  // ...
}
```

## Co-located logic hooks

Logic that's specific to one component but non-trivial lives in `use-<component>.ts` next to the component file:

```
features/classes/components/class-card/
├── class-card.tsx
├── use-class-card.ts        # all hooks, data, handlers, derived values
└── index.ts
```

The component file becomes purely declarative. The hook returns named values for destructuring.

## Pure model functions — extract React-free logic

WHEN feature logic is non-trivial and touches no React API (payload builders, derived computations, validators, state machines) → extract it as pure exported functions in `features/<name>/model/`; the `use-<x>` hook stays as thin glue wiring them to React state. The signal: a hook past ~100 lines where half the lines never touch a React API. The payoff: pure model functions unit-test without renderers or provider mocks — plain input/output assertions.

```
features/classes/
├── model/
│   ├── build-schedule-payload.ts   # pure: (values) => CreateScheduleInput
│   └── validate-slot-overlap.ts    # pure: (slots) => SlotConflict[]
└── components/class-schedule/
    ├── class-schedule.tsx
    └── use-class-schedule.ts       # glue: form state + model calls + handlers
```

## Hard limits

- One component per file — splitting saves more than it costs
- 500 lines max per component file — past that, extract sub-components or hooks
- Constants outside component bodies — never define a `LABELS` object inside a function (re-created every render)
