---
name: android-di-koin
description: Dependency Injection with Koin — modules composed in :app, started by the Application
globs: ["mobile/android/app/**/*.kt", "mobile/android/features/**/*ViewModel.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Dependency Injection (Koin)

Koin wires the object graph across the app.

## Module organization

- **Koin only in `:app`**: declare Koin modules under `app/src/main/kotlin/com/monorepo/android/di/`. Bind ViewModels, use cases, repository implementations, and platform facades there.
- **No Koin elsewhere**: `:domain`, `:data`, `:platform`, `:styleguide` and `:features` expose plain classes / interfaces — they do not depend on Koin.
- **App entry point**: the `Application` starts Koin —

```kotlin
class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@MainApplication)
            modules(appModule)
        }
    }
}
```

## Binding idioms

| Kind | Idiom |
|---|---|
| Interface → impl (repository, platform facade) | `single<Interface> { Impl(get()) }` |
| Use case | `factoryOf(::XUseCase)` |
| ViewModel | `viewModelOf(::XViewModel)` |

## Resolving ViewModels

`koinViewModel<T>()` (from `koin-androidx-compose`) is resolved at the **root of a Compose feature screen** — the NavHost destination block — never inside the stateless `*Screen.kt`. That is what keeps screens previewable. Pass `state` / `onIntent` down.

Checklist for a new screen: declare the ViewModel → register it in `appModule` → resolve it in the NavHost destination → pass typed args into the stateless screen.

## Anti-patterns

- ❌ `get()` or `inject()` inside a Composable body
- ❌ `KoinComponent` service-locator style
- ❌ Declaring a Koin module outside `:app`
- ❌ Manually threading dependencies down a deep Composable tree
