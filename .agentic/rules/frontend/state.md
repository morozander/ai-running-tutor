---
name: frontend-state
description: State management — Apollo cache, useState, useSearchParams, React Context
globs: ["frontend/src/**/*.tsx", "frontend/src/**/*.ts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Frontend State Management

| State category | Tool | Rule |
|---|---|---|
| Server data | Apollo `InMemoryCache` | All GraphQL data — never duplicate into `useState` |
| URL-persisted state | `useSearchParams` (or wrapped hook) | Pagination, search, filter — anything shareable via URL |
| Auth state | React Context (`AuthProvider`) | Tokens, current user, primary role |
| Theme | React Context (`ThemeProvider`) | Light/dark, persisted to `localStorage` |
| Component-local UI | `useState`, `useReducer` | Dialog open/close, transient form state, tab index |
| Form state | React Hook Form | All form fields — see [forms.md](./forms.md) |

## No additional global stores

**No Zustand, Redux, Jotai, MobX, Recoil.** If you think you need one, the data probably belongs in:

- Apollo cache (it's server data — even if computed)
- URL (it should be shareable / survive refresh)
- React Context (it's a singleton like auth or theme)

If after that it's truly cross-component client-only state with no clear owner, raise it as a discussion before introducing a new library.

## Apollo cache as state

Apollo cache is your client-side database. Read it directly via `useQuery` or `client.readQuery`:

```ts
// In a component
const { data } = useGetCurrentUser();  // reads from cache + refetches if stale

// Outside React (rare)
const cached = client.readQuery({ query: GET_CURRENT_USER });
```

## URL state

Wrap `useSearchParams` per concern in a feature hook:

```ts
// features/admins/hooks/use-admins-filters.ts
import { useSearchParams } from 'react-router';

export function useAdminsFilters() {
  const [params, setParams] = useSearchParams();

  return {
    page: Number(params.get('page') ?? 1),
    search: params.get('search') ?? '',
    setPage: (n: number) => setParams(p => { p.set('page', String(n)); return p; }),
    setSearch: (s: string) => setParams(p => {
      s ? p.set('search', s) : p.delete('search');
      p.delete('page'); // back to page 1 — stale page + new filter renders an empty page
      return p;
    }),
  };
}
```

WHEN search/filter/sort changes → reset `page` to 1 **in the same `setParams` call**. A filter change that preserves `page=5` is a bug class (an empty page with results hiding on page 1). The per-feature params hook owns this invariant precisely so callers can't forget it.

For typed multi-param state (sort, tabs, enums), build a `useTypedSearchParams<T>()` helper.

## React Context for true cross-cutting state

```ts
// shared/contexts/auth-context.tsx
type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (credentials: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... use Apollo + Amplify to manage state
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

Always throw from the hook if the context is missing — it surfaces forgotten providers immediately.

## Local state guidelines

Use `useState` for state that doesn't leave the component tree:

```ts
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [searchInput, setSearchInput] = useState('');  // before debounce
```

For derived values, prefer `useMemo` over `useEffect + useState`:

```ts
// ✅
const filtered = useMemo(() => items.filter(matchesQuery(query)), [items, query]);

// ❌
const [filtered, setFiltered] = useState([]);
useEffect(() => { setFiltered(items.filter(matchesQuery(query))); }, [items, query]);
```

## Hard rules

- ❌ Never duplicate server data into `useState`
- ❌ Never store auth/theme/permission state in `useState` — use Context
- ❌ Never use `useEffect` for data fetching — Apollo owns that
- ❌ Never introduce Zustand/Redux/Jotai without team-level discussion
- ❌ `useRef` as a state substitute when the UI must update — refs are valid for DOM nodes AND mutable non-render values (timers, previous values)
- ❌ `useEffect` chain to derive computed state — use `useMemo`
