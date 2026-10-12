---
name: android-architecture
description: Module boundaries and Clean Architecture + MVI for the mobile/android app
globs: ["mobile/android/**/*.kt", "mobile/android/**/*.gradle.kts"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Module architecture

Native Android app (Jetpack Compose). Gradle build rooted at `mobile/android/` — **no `package.json`, no pnpm, no Metro**. Package root `com.monorepo.android`. Clean Architecture + MVI, scaffolded in `:features`.

Left column = what the module **owns**. Right column = what it **must not** contain (those belong elsewhere).

| Module | Owns | Must not own |
|--------|------|--------------|
| `:app` | Thin host — `MainActivity`, the `Application` that starts Koin, all Koin modules (`di/`) | Business rules, screen UI, design tokens |
| `:features` | Screens, feature MVI (Contract/Screen/ViewModel), the `mvi` base, navigation wiring | Platform SDKs / device APIs, design tokens, shared theme (use `:styleguide`), direct data access |
| `:domain` | Use cases, domain models, repository interfaces, the `Resource<T>` / `ErrorType` wrapper. Pure-Kotlin base layer | UI, Koin, Retrofit/Room, `android.*` |
| `:data` | Repository impls, remote/local data sources, DTOs, mappers | UI, Koin, business rules |
| `:platform` | OS capabilities / device APIs (Location, Camera, Bluetooth, permissions, sensors) behind small facades | UI, theme, feature screens |
| `:styleguide` | App theme (`AppTheme`), design tokens, reusable UI components | Feature screens (use `:features`), device APIs (use `:platform`) |

`:domain` is a **pure Kotlin (`kotlin("jvm")`) library** — it has no Android on its classpath, which enforces platform-agnosticism by construction. Every other module is `com.android.library`; `:app` is the one `com.android.application`.

## Dependency direction

```
app ──► domain, data, platform, styleguide, features   (composes Koin; the only com.android.application)
features ──► domain, styleguide, platform (as needed)  (never data)
data ──► domain, platform
platform ──► domain
```

A repository reaches the UI only through a `:domain` interface bound in `app/.../di/AppModule.kt`; adding `implementation(project(":data"))` to `:features` defeats the layering. **`:features` talks to OS capabilities only through a `:platform` facade**, never `android.*` directly.

## Presentation

- Use the `com.monorepo.android.features.mvi` base (`MviViewModel`, `MviIntent` / `MviState` / `MviEffect`).
- Each feature package: `{Feature}Contract.kt`, `{Feature}Screen.kt`, `{Feature}ViewModel.kt` — see the `feature-mvi` rule.
- Keep Composables free of business logic; ViewModels own state updates.
- Follow official Google (Android / Compose / Material 3) guidance — see `platform-best-practices`.

## When adding code

- New OS capability / device API / sensor → `:platform`
- New colors, typography, buttons, shared controls → `:styleguide`
- New user-facing flow → `:features` (+ `:domain` / `:data` if needed)
- New DI binding → `:app/.../di/`
- Do not add comments to methods, classes, or inline code unless it is absolutely necessary.
