---
name: android-domain-module
description: Domain module owns pure business logic, use cases, and repository interfaces
globs: ["mobile/android/domain/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# `:domain` module

`:domain` is the core of the Clean Architecture and the base layer — pure Kotlin, no module dependencies. It must stay 100% platform-agnostic and free of framework dependencies (no Retrofit/Ktor, no Room, no Compose, no Koin, no `android.*`). Foundational KotlinX libraries used as domain API primitives — especially `kotlinx-coroutines` (`Flow`, `suspend`) and `kotlinx-datetime` — are allowed.

## Owns

- **Entities** — pure Kotlin data/sealed classes representing core business models.
- **Repository interfaces** — contracts for how data is accessed or stored.
- **Use cases (interactors)** — one piece of business logic each.
- The shared `Resource<T>` / `ErrorType` result wrapper.

## Does not own

- UI components, ViewModels, or platform SDKs.
- Repository implementations, DTOs, or database schemas.

## Practices

- **Use cases**: expose a single responsibility via `operator fun invoke()` so they call like functions. A use case that merely forwards one repository call with no rule is redundant — call the repository directly.
- **Threading**: use cases never choose a dispatcher or constrain how heavy an operation is. The caller (usually a ViewModel) owns the coroutine context.
- **Return types**: return a domain entity, wrap in Kotlin `Result`, or expose a `Flow`.

## Anti-patterns

- ❌ A `domain/` file importing a framework or Android package (network / DB library, Compose, Koin, `android.*`)
- ❌ A use case that forwards a single repository call with no business rule
