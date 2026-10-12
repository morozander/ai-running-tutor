# Frontend Package — AI Context

## Stack

- **React 19** functional components
- **Vite 7** build tool
- **React Router v7** with `createBrowserRouter` (object config)
- **Apollo Client 4** for GraphQL
- **GraphQL Codegen** with `client` preset
- **Tailwind CSS 4** with design tokens via `@theme inline`
- **React Hook Form 7** + **Zod 4** for forms
- **Biome** for lint/format
- **Stylelint** for CSS
- **Vitest** for tests
- **pnpm 9** package manager

## Folder layout

```
frontend/src/
├── app/                  # Bootstrap: app.tsx, providers.tsx, router.tsx
├── shared/
│   ├── config/           # ROUTES, env, role-permissions
│   ├── hooks/            # Cross-feature hooks
│   ├── lib/              # cn(), pure utilities
│   ├── types/            # Domain types
│   └── ui/               # Design-system primitives
├── components/           # Composite shared components
├── features/             # Self-contained feature modules
├── pages/                # Thin route components
├── graphql/
│   ├── client.ts         # ApolloClient w/ link chain
│   ├── queries/, mutations/
│   └── generated/        # codegen output (never edit)
└── assets/
```

## Path alias

`@/` → `frontend/src/`

## Key conventions

- All GraphQL operations **wrapped in custom hooks** — never call `useQuery`/`useMutation` in components
- All routes via a `ROUTES` const — no magic strings (the frontend rules target `src/shared/config/routes.ts`; e.g. (THIS repo) the router config currently lives at `src/router/router.tsx` — check for the convention, not only the literal path)
- Forms via RHF + Zod, schemas co-located in `features/<X>/schemas/`
- Use `cn()` for className composition, never template literals
- Apollo `cache.evict` for invalidation, never `refetchQueries`

## Commands

```bash
cd frontend
pnpm install
pnpm dev              # Vite dev server
pnpm build            # production build
pnpm test             # Vitest
pnpm test:watch       # watch mode
pnpm lint             # Biome lint + format check
pnpm lint:fix         # auto-fix
pnpm codegen          # regenerate GraphQL types from backend schema
```

## Relevant rule files

- [Architecture](../rules/frontend/architecture.md)
- [Routing](../rules/frontend/routing.md)
- [Data layer (Apollo)](../rules/frontend/data.md)
- [Forms](../rules/frontend/forms.md)
- [Styling](../rules/frontend/styling.md)
- [Components](../rules/frontend/components.md)
- [State](../rules/frontend/state.md)
- [UX patterns](../rules/frontend/ux.md)
- [Testing](../rules/frontend/testing.md)
