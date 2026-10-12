---
name: frontend-data
description: Apollo Client 4 + GraphQL Codegen — link chain, hook wrapping, cache invalidation
globs: ["frontend/src/graphql/**/*", "frontend/src/features/**/hooks/**/*", "frontend/src/features/**/api/**/*"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Frontend Data Layer

## Stack

- **Apollo Client 4** — all GraphQL operations
- **graphql-codegen** with `client` preset — `gql.ts`, `graphql.ts`, `fragment-masking.ts` output to `src/graphql/generated/`

## Apollo client setup — auth is owned by Amplify

Auth in this app is AWS Amplify (Cognito). **Never hand-roll token storage or refresh** (no localStorage tokens, no manual refresh queue) — `fetchAuthSession` caches tokens and refreshes expired ones internally; the link chain just asks it for the current token.

The real client (e.g. (THIS repo): `src/graphql/client.ts`):

```ts
// src/graphql/client.ts
import { InMemoryCache } from '@apollo/client/cache';
import { ApolloClient } from '@apollo/client/core';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ApolloLink } from '@apollo/client/link';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { HttpLink } from '@apollo/client/link/http';
import { fetchAuthSession } from 'aws-amplify/auth';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_APP_API_URL, // e.g. (THIS repo) — see vite-env.d.ts / .env.example
});

// Proactive: attach the current token. Amplify serves it from cache and
// transparently refreshes when expired — no manual expiry checks here.
const authLink = new SetContextLink(async prevContext => {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();

  return {
    ...prevContext,
    headers: {
      ...prevContext.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Reactive: on UNAUTHENTICATED, force one refresh and replay the operation.
const errorLink = new ErrorLink(({ error, forward, operation }) => {
  const isUnauthenticated = CombinedGraphQLErrors.is(error)
    ? error.errors.some(err => err.extensions?.code === 'UNAUTHENTICATED')
    : true;

  if (isUnauthenticated) {
    return from(fetchAuthSession({ forceRefresh: true })).pipe(switchMap(() => forward(operation)));
  }
});

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
```

Decision signals:

- **WHEN attaching tokens per request** → plain `fetchAuthSession()` (cached). `forceRefresh: true` belongs ONLY in the reactive 401 path — per-request force-refresh defeats Amplify's token cache and adds a Cognito round-trip to every operation.
- **WHEN a request fails with `UNAUTHENTICATED`** → force one refresh, replay the operation once (the `ErrorLink` + rxjs `switchMap` pattern above). Don't build a manual `isRefreshing`/pending-queue — Amplify already serializes refreshes.
- **WHEN working in a non-Amplify project** → a shared-module refresh queue is the equivalent pattern, but in THIS repo it would contradict the Cognito setup; don't introduce one.
- **WHEN a non-auth operation error reaches the link chain** → the `ErrorLink` also owns the default user-facing toast: sanitized message for any operation that hasn't claimed its own error UX, silenced per operation via `context: { skipGlobalErrorToast: true }` — see the centralized error surface in [ux.md](./ux.md). Copy-pasted `toast.error` in every mutation `onError` is the violation signal.

### Auth header contract

The backend `AuthGuard` accepts **exactly** `Authorization: Bearer <token>` (it splits on the space and rejects any other format), verifies it against the Cognito pool, and reads `sub`/`email`/`cognito:groups` claims. The web client above complies (`Bearer ${accessToken}`) — but note, flagged for the owner (THIS repo): Cognito ACCESS tokens don't carry the `email` claim the guard maps, and mobile currently sends a raw `idToken` with no `Bearer` prefix (which the backend rejects). The id-vs-access token choice is an owner decision pending — see the matching note in `mobile/data.md`; don't change token type unilaterally.

Note Apollo 4 entry points: core classes from `@apollo/client`/deep entry points, errors from `@apollo/client/errors`, links from `@apollo/client/link/*` — and React hooks from `@apollo/client/react` (see below).

## All operations wrapped in hooks

**Components never call `useQuery` / `useMutation` directly.** Wrap in feature-scoped hooks.

```ts
// src/features/admins/hooks/use-get-admins.ts
import { useQuery } from '@apollo/client/react'; // Apollo 4: hooks live in /react, not the root entry
import { GET_ALL_ADMINS } from '@/graphql/queries/admins';
import type { GetAllAdminsQuery, GetAllAdminsQueryVariables } from '@/graphql/generated/graphql';

export type UseGetAdminsResult = {
  admins: AdminListItem[];
  total: number;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

export function useGetAdmins({ page, pageSize }: UseGetAdminsParams): UseGetAdminsResult {
  const { data, loading, refetch } = useQuery<GetAllAdminsQuery, GetAllAdminsQueryVariables>(
    GET_ALL_ADMINS,
    { variables: { input: { page, pageSize } }, fetchPolicy: 'cache-and-network' },
  );

  return {
    admins: data?.getAllAdmins.admins ?? [],
    total: data?.getAllAdmins.total ?? 0,
    isLoading: loading,
    refetch,
  };
}
```

**Always pass `<TData, TVariables>` generics.** Untyped Apollo calls are forbidden.

## Refetch without flashing — `previousData`

WHEN a watched query refetches because its variables changed (page, filter, debounced search) → render `data ?? previousData` so the list keeps its rows during the refetch; reserve the skeleton for the true first load:

```ts
const { data, previousData, loading } = useQuery<GetAllAdminsQuery, GetAllAdminsQueryVariables>(
  GET_ALL_ADMINS,
  { variables: { input: { page, pageSize } } },
);

return {
  admins: (data ?? previousData)?.getAllAdmins.admins ?? [],
  isLoading: loading && !previousData, // skeleton only before the first result
};
```

A table that collapses to a skeleton on every page/filter change is the violation signal.

## Non-GraphQL APIs — keep them out of Apollo

WHEN a feature must call an external REST API (third-party service, non-GraphQL endpoint) → give it a real data layer with caching/retry/dedup behind a feature hook, exactly like the GraphQL side. Never fetch-in-`useEffect` with hand-rolled loading flags, and never tunnel REST through Apollo link hacks. The feature-hook boundary is identical on both sides — components can't tell which client served them. (THIS repo) is pure GraphQL today — add nothing until the first real REST integration lands; when it does, the company's credible REST projects converge on TanStack Query with one shared `QueryClient` at the app root (a tagged example, not a mandate — pick what fits the integration).

## Document organization

```
src/graphql/
├── queries/
│   ├── admins.ts        # export const GET_ALL_ADMINS = gql`...`
│   ├── users.ts
│   └── index.ts
├── mutations/
│   ├── admins.ts
│   └── index.ts
└── generated/           # codegen output — never edit
    ├── graphql.ts
    ├── gql.ts
    └── fragment-masking.ts
```

**Never** inline `gql` strings in a hook or component file.

## Cache invalidation — prefer `cache.evict`

After a mutation, evict the affected fields and let dependent queries refetch on their own. **Avoid `refetchQueries`** — it silently fails when the query is unmounted or variables don't match.

```ts
useMutation(CREATE_ADMIN, {
  update: (cache) => {
    cache.evict({ fieldName: 'getAllAdmins' });
    cache.evict({ fieldName: 'getAdminStats' });
    cache.gc();
  },
});
```

For pagination (`fetchMore`), define `merge` on the type policy in `InMemoryCache` rather than evicting:

```ts
new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        findAllLecture: {
          keyArgs: ['query', ['where']],
          merge(existing, incoming, { args }) {
            if (args?.query?.skip > 0 && existing) {
              return { ...incoming, items: [...existing.items, ...incoming.items] };
            }
            return incoming;
          },
        },
      },
    },
  },
});
```

## Codegen

Run the codegen script after backend schema changes — the script name is owned by `frontend/package.json` (e.g. (THIS repo): `pnpm codegen`, which runs `graphql-codegen --config codegen.ts`). Output lands in `src/graphql/generated/` and is excluded from typecheck-strict but included in build.

**Never hand-write a type that codegen produces.** If a type is missing, add the query to a `.ts` file under `src/graphql/queries/` or `mutations/` and regenerate.

## Hard rules

- ❌ Components never call `useQuery` / `useMutation` directly
- ❌ Never write raw `gql` template literals in hook or component files
- ❌ Never edit files in `src/graphql/generated/`
- ❌ Never use `refetchQueries` — use `cache.evict` + `cache.gc()`
- ❌ Never call Apollo with untyped generics
- ❌ Never store server data in `useState` — Apollo cache is the source of truth
