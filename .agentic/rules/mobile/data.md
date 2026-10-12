---
name: mobile-data
description: Apollo Client 4 + cache persistence + token refresh queue
globs: ["mobile/expo-boilerplate/src/api/**/*", "mobile/expo-boilerplate/src/features/**/hooks/**/*"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Mobile Data Layer

## Stack

- **Apollo Client 4** — all GraphQL operations
- **`apollo3-cache-persist` + AsyncStorage** — persists cache between app launches
- **graphql-codegen** — typed queries/mutations from schema
- **AWS Amplify** — Cognito JWT lifecycle

## Apollo client setup

```ts
// src/api/client.ts
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageWrapper, persistCache } from 'apollo3-cache-persist';
import * as Auth from 'aws-amplify/auth';

const getToken = async (options?: { forceRefresh?: boolean }) => {
  const session = await Auth.fetchAuthSession(options);
  return session?.tokens?.idToken?.toString() ?? null;
};

let staticClient: ApolloClient; // Apollo 4: ApolloClient takes no generic

export async function createApolloClient() {
  if (staticClient) return staticClient;

  // Per-request: plain fetchAuthSession() — Amplify serves the cached token and
  // refreshes expired ones internally. forceRefresh here would defeat the cache
  // and add a Cognito round-trip to EVERY operation.
  const authLink = new SetContextLink(async (prevCtx) => {
    const token = await getToken();
    return {
      headers: {
        ...prevCtx.headers,
        // The backend AuthGuard requires exactly `Bearer <token>` — see Auth header contract below
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  // Token-refresh queue
  let isRefreshing = false;
  let pendingRequests: Array<(token: string) => void> = [];

  const errorLink = new ErrorLink(({ error, operation, forward }) => {
    const isUnauth =
      (CombinedGraphQLErrors.is(error) &&
        error.errors.some(e => {
          const code = (e.extensions?.code as string ?? '').toLowerCase();
          const msg = (e.message ?? '').toLowerCase();
          return code === 'unauthenticated' || msg.includes('jwt expired');
        })) ||
      error.message?.toLowerCase() === 'unauthenticated';

    if (!isUnauth) return;

    if (!isRefreshing) {
      isRefreshing = true;
      // Reactive 401 path — the ONLY place forceRefresh belongs
      getToken({ forceRefresh: true })
        .then(token => {
          pendingRequests.forEach(cb => cb(token ?? ''));
          pendingRequests = [];
        })
        .finally(() => { isRefreshing = false; });
    }

    return new Observable(observer => {
      pendingRequests.push((token) => {
        operation.setContext(({ headers = {} }) => ({
          headers: { ...headers, Authorization: `Bearer ${token}` },
        }));
        forward(operation).subscribe(observer);
      });
    });
  });

  const httpLink = new HttpLink({ uri: process.env.EXPO_PUBLIC_GRAPHQL_URL });

  const cache = new InMemoryCache();
  await persistCache({ cache, storage: new AsyncStorageWrapper(AsyncStorage) });

  staticClient = new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache,
    defaultOptions: {
      query: { fetchPolicy: 'cache-first' },
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });

  return staticClient;
}
```

Token decision signals:

- **WHEN attaching the token per request** → plain `fetchAuthSession()`; Amplify caches tokens and refreshes them when expired.
- **WHEN a request comes back unauthenticated** → that's the one place for `fetchAuthSession({ forceRefresh: true })`, then replay the queued operations.
- Heads-up (THIS repo): the boilerplate `src/api/client.ts` still calls `forceRefresh: true` on every request — that's the known flaw this rule corrects; don't copy it.

## Auth header contract

The backend `AuthGuard` accepts **exactly** `Authorization: Bearer <token>` — its `extractToken` splits on the space and rejects anything that isn't `Bearer <jwt>` ("Invalid authorization header format"). It then verifies signature + issuer against the Cognito pool and builds the user from `sub`/`email`/`cognito:groups` claims.

**Known inconsistency, flagged for the owner** (THIS repo):

- Web sends `Bearer ${accessToken}` — format OK, but Cognito ACCESS tokens don't carry `email`/`given_name` claims the guard reads.
- The real mobile boilerplate client sends a **raw `idToken` with NO `Bearer` prefix** — the backend rejects that format outright; mobile auth cannot work against this backend as-is.

The snippet above shows the contract-compliant form (`Bearer` + token). Before building on mobile auth, raise the token-type decision (id vs access) with the owner so both clients align — don't silently pick a side per app.

## Cache persistence

`apollo3-cache-persist` writes the cache to AsyncStorage after every change. This lets the app open instantly with last-known data — even offline — while a background refetch updates it.

**Caveats:**

- Cache rehydration is **async**. The app shell must await `createApolloClient()` before rendering child providers.
- For sensitive data, use `expo-secure-store` instead of AsyncStorage, or selectively evict before persistence.
- Persisted cache can drift after backend schema changes. On startup, compare an app version stored alongside; if changed, `persistor.purge()` before rehydrating.

## Device storage

**WHEN more than one module touches device storage** → a single typed wrapper with an enum key registry (`StorageKeys` enum + `get`/`set`/`remove`, e.g. `src/core/storage.ts`), never raw `AsyncStorage` calls with string keys scattered through features. It prevents key drift and gives ONE seam to route sensitive keys to `expo-secure-store` — the wrapper is the enforcement point for the "no plaintext tokens" hard rule below. Cautionary tale from company code: the most disciplined production app still writes its auth token through its wrapper into plaintext AsyncStorage — discipline alone doesn't catch this; the seam does, by making key→backend routing a reviewed decision in one file.

## Hook wrapping

Same rule as frontend: **components never call `useQuery` / `useMutation` directly**. Wrap in feature hooks with typed generics.

```ts
// src/features/profile/hooks/use-profile.ts
import { useQuery } from '@apollo/client/react'; // Apollo 4: hooks live in /react

export function useProfile(userId: string) {
  const { data, loading, refetch } = useQuery<GetProfileQuery, GetProfileQueryVariables>(
    GET_PROFILE,
    { variables: { userId }, fetchPolicy: 'cache-and-network' },
  );

  return {
    profile: data?.getProfile ?? null,
    isLoading: loading,
    refetch,
  };
}
```

## Cache invalidation

Prefer `cache.evict` over `refetchQueries`. Same rule as frontend — see [`frontend/data.md`](../frontend/data.md).

## Paginated lists

**WHEN a list paginates via `fetchMore` / infinite scroll** → define a cache **field policy**: `keyArgs` matching the real partition key (the args that identify a distinct list — filters, parent id, tab) plus a `merge` that dedupes by id. Keep policies in a dedicated module (e.g. `src/api/cache-policies.ts`) passed into `InMemoryCache`, not inline in `client.ts`. The smell is merging pages in component or hook state. This pairs with cache persistence above: paginated fields get persisted too, so wrong `keyArgs` rehydrates cross-contaminated lists. Production-proven on three infinite lists in a company app.

## Offline strategy

The signal: **what does the user lose if this request never arrives?**

- **Nothing they typed** (reads, refetches) → cache-and-retry is enough: the persisted cache already serves last-known data, and a `RetryLink` (`@apollo/client/link/retry`) with backoff handles transient failures — both NetInfo (`@react-native-community/netinfo`) and Apollo's RetryLink are already available (THIS repo). Use NetInfo to distinguish "you're offline" from "server error" in messaging.
- **User-created CONTENT** (drafts, form submissions) → explicit handling: a queue/outbox with replay, or at minimum an error UI that preserves the input and offers retry. The boilerplate doesn't ship an outbox — add it per-feature when a feature actually creates offline-loseable content.
- **Ephemeral UI state** → nothing; don't persist it.

**Don't build outbox machinery for read-only screens** — the persisted cache + `cache-and-network` already gives offline reads.

## Hard rules

- ❌ Apollo calls in components — always wrap
- ❌ Untyped `useQuery` / `useMutation` — always pass generics
- ❌ `refetchQueries` — use `cache.evict` + `cache.gc()`
- ❌ Persist tokens to AsyncStorage in plaintext — use `expo-secure-store` (enforced at the storage wrapper, the single seam)
- ❌ Raw `AsyncStorage` calls with string keys outside the typed storage wrapper (once one exists)
- ❌ Merging paginated results in component/hook state — define a cache field policy
- ❌ Render the app before `createApolloClient()` resolves (cache rehydration must complete)
