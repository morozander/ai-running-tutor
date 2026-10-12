---
name: android-platform
description: Platform module owns OS capabilities and device APIs behind small facades
globs: ["mobile/android/platform/**/*.kt", "mobile/android/app/**/AndroidManifest.xml"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# `:platform` module

Owns all OS capabilities and device APIs (Location, Camera, Bluetooth, Push, sensors, permissions).

## Placement

- Expose a small **interface** (facade) and an Android implementation class, e.g. `interface PlatformInfo` + `class AndroidPlatformInfo`. Callers (`:data`, `:features`) depend on the interface; `:app` binds the implementation in Koin.
- Keep `android.*` imports inside `:platform` — a facade keeps them off `:domain`/`:features` classpaths. **`:features` must never call `android.*` / device APIs directly.**
- No Compose theme or feature screens here. A platform view-interop `@Composable` wrapping an Android `View` (e.g. a `WebView`) is allowed; keep the surrounding chrome in `:features`.

## Practices

- Follow official Google guidance for the capability (runtime permissions, privacy, background-execution limits) — see `platform-best-practices`.
- **Prefer existing libraries** (Retrofit/Ktor for HTTP, DataStore for key-value, Room for persistence, CameraX, Play Services Location) before hand-rolling a facade. Reserve `:platform` classes for capabilities without a clean library.
- Declare every permission the code requests in `app/src/main/AndroidManifest.xml`, and request dangerous permissions at runtime.
- Prefer small, testable facades over leaking framework types into `:features`.
- Add tests for new platform behavior (JVM unit tests with a fake where possible; Robolectric or instrumented tests for genuinely device-bound code).

```text
platform/src/main/kotlin/com/monorepo/android/platform/
  <capability>/   # e.g. location/, camera/, bluetooth/, notifications/
```

## Anti-patterns

- ❌ `android.*` imports leaking into `:features` or `:domain`
- ❌ Requesting a permission never declared in the manifest, or declaring one never requested
- ❌ A hand-rolled facade where a standard Jetpack/Play-Services library already covers the need
