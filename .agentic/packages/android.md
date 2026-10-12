# Mobile-Android Package — AI Context

Native **Android** app (Jetpack Compose) — a structural template with layered modules, an MVI base, Koin DI, type-safe navigation, and an end-to-end sample slice. It is **not** the Expo app in [`mobile/`](../../mobile) or the KMP template in [`mobile/kmp/`](../../mobile/kmp); the three are independent. It shares the KMP template's architecture, adapted for Android only (no iOS, no Kotlin Multiplatform).

**Gradle build — no `package.json`, no pnpm, no Metro.** Package root `com.monorepo.android`.

## Stack

- **Kotlin 2.2.10** / **Jetpack Compose** (Compose BOM) / **AGP 9.4.0** — compileSdk 37, minSdk 30, targetSdk 37, JVM target 11
- **Koin 4.1.1** (`koin-android` + `koin-androidx-compose`) for DI — all modules composed in `:app`, started in the `Application`
- **navigation-compose** with type-safe `@Serializable` routes (+ kotlinx-serialization)
- **androidx.lifecycle** — `ViewModel`, `viewmodel-compose`, `runtime-compose`
- **kotlinx-coroutines**; **JUnit4** + **kotlinx-coroutines-test** — no mocking framework, hand-written fakes
- **ktlint** (`ktlint_official`) applied to every subproject
- AGP built-in Kotlin: `com.android.library` for library modules, `com.android.application` for `:app`, `kotlin("jvm")` for the pure `:domain`.

## Module map

```
mobile/android/
├── settings.gradle.kts        rootProject.name = "android"
├── gradle/libs.versions.toml  version catalog — the only place versions live
├── app/                       :app (com.android.application) — MainActivity, MainApplication (Koin), di/
├── domain/                    :domain (kotlin-jvm) — models, repository interfaces, use cases, Resource<T>. Base layer.
├── data/                      :data  repository impls, DTOs, mappers
├── platform/                  :platform  OS capabilities / device APIs behind facades
├── styleguide/                :styleguide  AppTheme, design tokens, reusable components
└── features/                  :features  all Compose UI, ViewModels, navigation, the MVI base
    ├── mvi/                   MviState / MviIntent / MviEffect / MviViewModel
    ├── home/                  Home MVI triad — the reference screen
    ├── details/               leaf screen reached by a type-safe route
    └── navigation/            AppRoute (@Serializable) + AppNavHost
```

## Dependency direction

```
app ──► domain, data, platform, styleguide, features   (composes Koin; the only com.android.application)
features ──► domain, styleguide, platform (as needed)  (never data)
data ──► domain, platform
platform ──► domain
```

`:features` does not depend on `:data` — a repository reaches the UI only through a `:domain` interface bound in `app/.../di/AppModule.kt`. `:features` must never call `android.*` directly; go through a `:platform` facade.

## The sample slice

`ObserveGreetingUseCase` (domain) → `PlatformInfoRepository` interface (domain) → `PlatformInfoRepositoryImpl` (data) → `PlatformInfo` facade + `AndroidPlatformInfo` (platform) → `HomeViewModel` (MVI) → stateless `HomeScreen`, wired in `appModule`, hosted by `App()` → `AppNavHost` (Home → Details via a `HomeEffect`). A Maestro journey (`.maestro/journeys/home.yaml`) drives it end-to-end. Grow it or delete it.

## Conventions

Full rules under [`.agentic/rules/android/`](../rules/android). Highlights: MVI for every screen (Contract/Screen/ViewModel), Koin only in `:app`, stateless screens with `@Preview` colocated in the same file, theme/components in `:styleguide`, OS capabilities only in `:platform` (never called from `:features`), type-safe navigation, dependencies only through the version catalog.
