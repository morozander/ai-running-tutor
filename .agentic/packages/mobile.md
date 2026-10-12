# Mobile Package — AI Context

## Stack

- **Expo SDK 54+** with **Expo Router** (file-based routing)
- **React Native 0.81+**
- **React 19** functional components
- **Apollo Client 4** + `apollo3-cache-persist` (AsyncStorage)
- **AWS Amplify v6** + Cognito for auth
- **React Hook Form** + **Zod** for forms
- **GraphQL Codegen** with `typescript-react-apollo`
- **i18next** + `expo-localization` for i18n
- **Jest** with `jest-expo` preset
- **`@react-navigation/*`** under the hood (Expo Router uses it)
- **React Native Reanimated** for animations
- **Native modules**: expo-haptics, expo-image, expo-linking, expo-splash-screen, expo-symbols, etc.

## Folder layout

```
mobile/expo-boilerplate/
├── app/                       # Expo Router — thin route wrappers only
│   ├── _layout.tsx            # Root layout
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── explore.tsx
│   └── modal.tsx
├── src/
│   ├── api/                   # Apollo client + queries/mutations
│   ├── components/            # ThemedText, ThemedView, HapticTab, etc.
│   ├── config/                # i18n, amplify config
│   ├── constants/             # Colors, Fonts, Spacing, Radius
│   ├── features/              # Self-contained features
│   ├── hooks/                 # use-color-scheme, use-theme-color, ...
│   ├── screens/               # Screen components for app/ routes
│   ├── types/
│   └── utils/
├── assets/
│   ├── locales/               # i18n JSON files
│   └── images/
└── app.json                   # Expo config
```

## Path alias

`@/` → `mobile/expo-boilerplate/src/`

## Key conventions

- `app/` contains **only** Expo Router files — business logic lives in `src/screens/` or `src/features/`
- Use **themed primitives** (`<ThemedText>`, `<ThemedView>`) for content — never raw `<Text>` / `<View>`
- Lists: always `FlatList` (or `FlashList` for large), never `.map()` in `<ScrollView>`
- Images: `expo-image`, never built-in `<Image>`
- Forms: same RHF + Zod pattern as frontend, but `Controller` + RN `<TextInput>`
- Theming via `useThemeColor` — automatic light/dark
- Platform-specific code: `.ios.tsx` / `.android.tsx` / `.web.tsx` suffix files
- Cache rehydration must complete before app renders (`apollo3-cache-persist`)
- Secrets in `expo-secure-store`, **never** AsyncStorage

## Commands

```bash
cd mobile/expo-boilerplate
npm install
npm start             # Expo dev server (Metro)
npm run ios           # iOS Simulator
npm run android       # Android Emulator
npm run web           # Expo Web
npm test              # Jest
npm run lint          # eslint-config-expo
```

## Relevant rule files

- [Architecture](../rules/mobile/architecture.md)
- [Routing (Expo Router)](../rules/mobile/routing.md)
- [Navigation patterns](../rules/mobile/navigation.md)
- [Data layer (Apollo + cache persist)](../rules/mobile/data.md)
- [Forms (RHF + TextInput)](../rules/mobile/forms.md)
- [Styling (StyleSheet + tokens)](../rules/mobile/styling.md)
- [Components (themed primitives, FlatList)](../rules/mobile/components.md)
- [Native modules](../rules/mobile/native-modules.md)
- [Platform-specific files](../rules/mobile/platform-files.md)
- [i18n](../rules/mobile/i18n.md)
- [Testing (Jest + jest-expo)](../rules/mobile/testing.md)
