---
name: mobile-architecture
description: Expo + Expo Router folder structure, src/ layout, path alias, app lifecycle, per-env identity
globs: ["mobile/**/*.ts", "mobile/**/*.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Mobile Architecture

## Stack

- Expo SDK 54+
- Expo Router (file-based routing)
- React Native 0.81+
- React 19
- TypeScript strict
- AsyncStorage for persistence
- Apollo Client 4 + GraphQL Codegen for data
- AWS Amplify + Cognito for auth
- i18next + expo-localization for i18n
- Jest + jest-expo for tests

## Folder structure

The app root `mobile/expo-boilerplate/` is e.g. (THIS repo) — another project's app dir will have its own name; the convention is the structure beneath it (and sibling rules' globs target this path, so renaming it means updating them):

```
mobile/expo-boilerplate/
├── app/                       # Expo Router — file-based routes only
│   ├── _layout.tsx            # Root layout (providers, theme, splash)
│   ├── (tabs)/                # Tab group — shared tab bar
│   │   ├── _layout.tsx        # Tab bar config
│   │   ├── index.tsx          # Home tab
│   │   └── explore.tsx        # Explore tab
│   └── modal.tsx              # Modal screen
├── src/
│   ├── api/                   # Apollo client + GraphQL ops
│   │   ├── client.ts          # ApolloClient factory w/ link chain + cache persist
│   │   ├── queries/
│   │   ├── mutations/
│   │   └── generated/         # codegen output
│   ├── components/            # Reusable RN components
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   ├── haptic-tab.tsx
│   │   └── ui/                # Native primitives (icon-symbol, etc.)
│   ├── config/
│   │   ├── amplify.config.ts
│   │   └── i18n.ts
│   ├── constants/
│   │   └── theme.ts           # Colors + Fonts (Platform.select)
│   ├── features/              # Feature folders (same shape as FE)
│   │   └── <feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── schemas/
│   │       └── index.ts
│   ├── hooks/                 # Cross-feature hooks
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts    # Platform-specific variant
│   │   └── use-theme-color.ts
│   ├── screens/               # Screen components imported by app/ routes
│   ├── types/
│   └── utils/
└── assets/
    ├── locales/               # i18n JSON files
    └── images/
```

## Routing vs screens

`app/` contains **only** Expo Router files (`_layout.tsx`, `(group)/`, `[param].tsx`, `index.tsx`). Each route file is a **thin wrapper** that imports a screen from `src/screens/`:

```tsx
// app/(tabs)/explore.tsx
import { ExploreScreen } from '@/screens/explore-screen';
export default function Explore() {
  return <ExploreScreen />;
}
```

Screen logic, components, and hooks live in `src/screens/<screen-name>/` or `src/features/<feature>/`. **No business logic inside `app/`.**

## Path alias

`@/` resolves to `mobile/expo-boilerplate/src/`. Configured in `tsconfig.json` and Babel/Metro.

```ts
// ✅
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

// ❌
import { ThemedText } from '../../components/themed-text';
```

`app/` files import from `@/` too — they're the only files allowed to use Expo Router APIs (`<Tabs>`, `<Stack>`, `useRouter`, `useLocalSearchParams`).

## Feature isolation

Same rule as frontend: features expose a public API through `index.ts`. Other modules import only from that barrel.

```ts
// ✅
import { ProfileForm, useProfile } from '@/features/profile';

// ❌
import { useProfile } from '@/features/profile/hooks/use-profile';
```

## App lifecycle — foreground refresh

**WHEN state can expire while the app is backgrounded** (session tokens, min-supported-version, time-based content) → re-validate it on the background→active transition. Web-derived rules never cover this — web pages don't background. The pattern: `AppState` listener comparing a previous-state ref, refresh on →active, unsubscribe on cleanup:

```ts
const appState = useRef(AppState.currentState);
useEffect(() => {
  const sub = AppState.addEventListener('change', (next) => {
    if (appState.current.match(/inactive|background/) && next === 'active') {
      checkAuthStatus(); // anything that goes stale while backgrounded
    }
    appState.current = next;
  });
  return () => sub.remove();
}, []);
```

## Per-environment app identity

**WHEN more than one backend environment exists** → every env gets a distinct bundle id / application id (suffix per env) so all envs install **side-by-side** on one device. (THIS repo / Expo): `app.config.ts` reads `APP_VARIANT` and sets `ios.bundleIdentifier` / `android.package` per variant; EAS build profiles set `APP_VARIANT`. The failure signal: if QA must uninstall prod to test stage, the identity scheme is wrong. Both company production apps run a 4-env topology this way (Android flavors + iOS schemes in bare RN).

## Hard limits

- One component per file
- 500 lines max per component file
- Constants outside component bodies (StyleSheet is the only exception — define it once at module scope)
