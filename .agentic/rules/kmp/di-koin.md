---
name: kmp-di-koin
description: Dependency Injection with Koin — modules composed in :composeApp, started by the hosts
globs: ["mobile/kmp/composeApp/**/*.kt", "mobile/kmp/features/**/*ViewModel.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Dependency Injection (Koin)

Koin wires the object graph across the KMP app.

## Module organization

- **Koin only in `:composeApp`**: declare Koin modules under `composeApp/src/commonMain/kotlin/com/monorepo/kmp/di/`. Bind ViewModels, use cases, repository implementations, and platform wrappers there.
- **No Koin elsewhere**: `:domain`, `:data`, `:platform`, `:styleguide` and `:features` expose plain classes / interfaces — they do not depend on Koin.
- **Platform-specific DI**: when a binding needs an Android/iOS type, keep the `expect`/`actual` (or wrapper) in `:platform` or `:composeApp`'s platform source sets, and register the common interface from `:composeApp`.
- **App entry point**: the thin hosts start Koin — `MainApplication` (Android) and `MainViewController` (iOS) both call `initKoin()`, which loads `appModule` + `platformModule()`.

## Binding idioms

| Kind | Idiom |
|---|---|
| Use case | `factoryOf(::XUseCase)` |
| Repository | `single<XRepository> { XImpl(get()) }` |
| ViewModel | `viewModelOf(::XViewModel)` |

## Resolving ViewModels

`koinViewModel<T>()` is resolved at the **root of a Compose feature screen** (the host that owns the screen), never inside the stateless `*Screen.kt` — that is what keeps screens previewable. Pass `state` / `onIntent` down.

Checklist for a new screen: declare the ViewModel → register it in the Koin module → resolve it at the screen root → pass typed args into the stateless screen.

## Anti-patterns

- ❌ `get()` or `inject()` inside a Composable body
- ❌ `KoinComponent` service-locator style
- ❌ Declaring a Koin module outside `:composeApp`
- ❌ Manually threading dependencies down a deep Composable tree
