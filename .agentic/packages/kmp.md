# Mobile-KMP Package — AI Context

Kotlin/Compose Multiplatform **template** (Android + iOS). A structural scaffold — layered modules, an MVI base, Koin DI, and a single end-to-end sample slice — that a real KMP app grows into. It is **not** the Expo app in [`mobile/`](../../mobile); the two are independent.

**Gradle build — no `package.json`, no pnpm, no Metro.** Package root `com.monorepo.kmp`.

## Stack

- **Kotlin 2.4.10** / **Compose Multiplatform 1.11.1** / **AGP 9.0.1** — compileSdk 36, minSdk 30, targetSdk 36, JVM target 11
- **Koin 4.1.1** for DI — all modules composed in `:composeApp`
- **kotlinx-coroutines** / **kotlinx-datetime** (datetime pinned 0.6.1)
- **androidx.lifecycle** (JetBrains multiplatform build) — `ViewModel`, `viewmodel-compose`, `runtime-compose`
- **kotlin.test** + **kotlinx-coroutines-test** — no mocking framework; hand-written fakes only
- **ktlint** (`ktlint_official`) applied to every subproject
- KMP modules use AGP's modern KMP plugin (`com.android.kotlin.multiplatform.library`, inline `android { }` DSL). **AGP 9 forbids `com.android.application` on a KMP module**, so the app host is a thin **`:androidApp`** (`com.android.application`); **`:composeApp`** is the KMP aggregator that composes Koin and produces the iOS `ComposeApp` framework.

**Intended-but-not-yet-wired** (documented in the rules as the target architecture): Ktor (OkHttp/Darwin), Room persistence, navigation-compose with type-safe `@Serializable` routes, compose `composeResources`. Add each through the version catalog when a feature first needs it.

## Module map

```
mobile/kmp/
├── settings.gradle.kts        rootProject.name = "Kmp"
├── gradle/libs.versions.toml  version catalog — the only place versions live
├── androidApp/                :androidApp (com.android.application) — thin Android host: MainActivity/MainApplication
├── composeApp/                :composeApp (KMP library) — Koin composition, App wiring, produces the iOS framework
│   └── src/{commonMain,androidMain,iosMain}/   MainViewController, di/ (AppModule + platform actuals)
├── domain/                   :domain     models, repository interfaces, use cases, Resource<T>. Base layer.
├── data/                     :data       repository impls, DTOs, mappers
├── platform/                 :platform   OS capabilities / device APIs (expect/actual)
├── styleguide/               :styleguide AppTheme, design tokens, reusable components
├── features/                 :features   all Compose UI, ViewModels, navigation, the MVI base
│   └── src/commonMain/kotlin/.../mvi/           MviState / MviIntent / MviEffect / MviViewModel
│   └── src/commonMain/kotlin/.../home/          Home MVI triad — the reference screen
└── iosApp/                    Swift host linking the ComposeApp framework
```

## Dependency direction

```
androidApp / iosApp ──► composeApp, features
composeApp ──► domain, data, platform, styleguide, features   (composes Koin; produces the iOS framework)
features ──► domain, styleguide, platform (as needed)         (never data)
data ──► domain, platform
platform ──► domain
```

`:features` deliberately does not depend on `:data` — a repository reaches the UI only through a `:domain` interface bound in `composeApp/.../di/AppModule.kt`. `:features` must never call Android/iOS SDKs directly; go through `:platform`.

## The sample slice

`ObserveGreetingUseCase` (domain) → `PlatformInfoRepository` interface (domain) → `PlatformInfoRepositoryImpl` (data) → `currentPlatform()` `expect`/`actual` (platform) → `HomeViewModel` (MVI) → stateless `HomeScreen`, wired in `appModule` and hosted by `App()`. Delete it or grow it — it exists to show every layer and the MVI contract in one working path.

## Conventions

Full rules under [`.agentic/rules/kmp/`](../rules/kmp). Highlights: MVI for every screen (Contract/Screen/ViewModel), Koin only in `:composeApp`, stateless screens with `@Preview` colocated in the same file, theme/components in `:styleguide`, OS capabilities only in `:platform` (never called from `:features`), dependencies only through the version catalog.
