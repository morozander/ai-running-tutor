---
name: android-data-module
description: Data module owns repository implementations, data sources, mappers, and the Resource vs Result contract
globs: ["mobile/android/data/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# `:data` module

`:data` manages all external data sources (network, database, preferences) and implements the contracts `:domain` declares.

## Owns

- **Repository implementations** — concrete classes fulfilling `:domain` interfaces.
- **Data sources** — local (Room, DataStore) and remote (Retrofit/Ktor, GraphQL).
- **Data models** — DTOs, database entities, request/response objects.
- **Mappers** — translate data models into pure domain entities.

## Does not own

- Business logic or domain rules (Use Cases own those).
- UI, presentation models, or ViewModels.
- OS hardware integrations (`:platform` owns those).

## `Resource<T>` vs `Result<T>`

Both are in play and not interchangeable. `Resource<T>` is declared in `:domain`:

```kotlin
sealed interface Resource<out T> {
    data class Success<T>(val data: T) : Resource<T>
    data class Error(val message: String = "", val cause: Throwable? = null, val type: ErrorType? = null) : Resource<Nothing>
    data object Loading : Resource<Nothing>
}
```

| Use | Type |
|---|---|
| Observed collections and screen-load state | `Resource<T>` (use `dataOrEmpty()` for list flows) |
| One-shot operations — network mutations, auth, sync | Kotlin `Result<T>` |

## Practices

- **Threading**: expose `suspend` functions and/or `Flow`. Do not switch dispatchers in `:data` — the caller (usually a ViewModel) owns the coroutine context.
- **Encapsulation**: keep database entities and DTOs `internal`. Only mapped domain entities cross the module boundary.
- **Prefer standard Jetpack/networking libraries** — Retrofit or Ktor for HTTP/GraphQL, Room or DataStore for persistence. Keep a device-bound SDK behind a `:platform` facade rather than calling it from a repository.
- **DI**: provide constructor-injectable implementations. No Koin in `:data` — bindings live in `:app`.

## Anti-patterns

- ❌ Koin imports in `:data`
- ❌ Leaking a transport type (a raw network/DB response or generated row type) upward
- ❌ A repository hardcoding a timeout instead of accepting one
