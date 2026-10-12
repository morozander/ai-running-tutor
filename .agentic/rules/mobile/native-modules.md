---
name: mobile-native-modules
description: Expo native APIs — haptics, image, linking, localization, splash, status bar
globs: ["mobile/expo-boilerplate/src/**/*.ts", "mobile/expo-boilerplate/src/**/*.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Expo Native Modules

This boilerplate uses Expo modules for native functionality. **Always prefer Expo over bare React Native APIs** — they handle iOS/Android differences and don't require ejecting.

## Available modules (from `package.json`)

| Module | Purpose |
|---|---|
| `expo-haptics` | Vibration / haptic feedback on interactions |
| `expo-image` | High-performance image (replaces RN `<Image>`) |
| `expo-linking` | Deep links + URL parsing |
| `expo-localization` | Locale detection + i18n integration |
| `expo-splash-screen` | Splash screen lifecycle |
| `expo-status-bar` | Status bar style |
| `expo-symbols` | SF Symbols on iOS (fallback on Android) |
| `expo-system-ui` | System UI styling |
| `expo-web-browser` | In-app browser (replaces `Linking.openURL` for external) |
| `expo-constants` | App constants (version, native build info) |
| `expo-font` | Custom font loading |

## Haptics

```ts
import * as Haptics from 'expo-haptics';

await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
await Haptics.selectionAsync();
```

Use sparingly — over-haptic-ing is annoying. Good cases:

- Tab selection (already in `<HapticTab>`)
- Form submission success/failure
- Pull-to-refresh
- Toggle switches

## Status bar

```tsx
import { StatusBar } from 'expo-status-bar';

<StatusBar style="auto" />  // 'auto' follows theme; 'light' / 'dark' override
```

Mount once in root layout.

## Splash screen

```tsx
// app/_layout.tsx
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = useLoadFonts();
  const isAuthReady = useAuthRehydration();
  const isCacheReady = useApolloRehydration();

  useEffect(() => {
    if (fontsLoaded && isAuthReady && isCacheReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthReady, isCacheReady]);

  if (!fontsLoaded || !isAuthReady || !isCacheReady) return null;
  return <Stack />;
}
```

Splash stays visible until your async boot is done.

## Deep links

```ts
import * as Linking from 'expo-linking';

const url = await Linking.getInitialURL();  // app opened from link?
const parsed = Linking.parse(url);          // { hostname, path, queryParams }

// Subscribe to incoming links while app is open
const sub = Linking.addEventListener('url', ({ url }) => handle(url));
```

For external URLs, **use `expo-web-browser`, not `Linking.openURL`** — keeps users in your app:

```ts
import * as WebBrowser from 'expo-web-browser';

await WebBrowser.openBrowserAsync('https://example.com');
```

## Localization

```ts
import * as Localization from 'expo-localization';

const locale = Localization.getLocales()[0]?.languageCode;  // 'en', 'uk', ...
const timezone = Localization.getCalendars()[0]?.timeZone;
```

Used by `i18next` to pick initial language — see [i18n.md](./i18n.md).

## Permissions

Each native module has its own `requestPermissionsAsync()`. Always ask **before** triggering the feature, not on app launch:

```ts
import * as ImagePicker from 'expo-image-picker';

const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  toast('Permission denied');
  return;
}
const result = await ImagePicker.launchImageLibraryAsync({ ... });
```

`app.json` declares the `usageDescriptions` that iOS shows in the permission prompt — keep them honest.

## Secure storage

Use `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android) for tokens / secrets:

```ts
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('refreshToken', token);
const stored = await SecureStore.getItemAsync('refreshToken');
```

**Never store tokens in plain AsyncStorage.**

## Hard rules

- ❌ Bare React Native APIs when Expo offers the same — use Expo
- ❌ `Linking.openURL` for external sites — use `WebBrowser.openBrowserAsync`
- ❌ Tokens in AsyncStorage plaintext — use `SecureStore`
- ❌ Permission requests on app launch — request at the point of use
- ❌ Calling Expo APIs without checking `Platform.OS` when the API is iOS-only (e.g., haptics return no-op on Android, but SF Symbols don't render)
