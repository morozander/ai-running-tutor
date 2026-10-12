---
name: kmp-navigation
description: Type-safe @Serializable routes for navigation-compose
globs: ["mobile/kmp/features/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Navigation

Navigation uses navigation-compose with **type-safe routes** — no string route interpolation anywhere. Wiring lives in `:features/navigation/` (`AppRoute.kt`, `AppNavHost.kt`); `AppNavHost` is the reference.

## Route declaration

Routes are `@Serializable` types (a sealed interface of destinations) carrying an explicit `@SerialName`:

```kotlin
@Serializable
sealed interface AppRoute {
    @Serializable @SerialName("home") data object Home : AppRoute
    @Serializable @SerialName("details") data class Details(val id: String) : AppRoute
}
```

**The `@SerialName` string is the stable identity.** Renaming the Kotlin class must not change it — that string is what persists across process death and what any deep link keys on.

## Adding a screen

Declare the route → add a `composable<Route>` block in `AppNavHost` → resolve the ViewModel there with `koinViewModel()` and collect its effects for navigation (`navController.navigate(...)`) → read args with `backStackEntry.toRoute<Route>()` → pass typed arguments into the stateless screen. Navigation is driven by an `MviEffect`, never a flag in state. Prefer extending the existing NavHost over standing up a parallel stack.

## Route arguments

Carry **ids and display hints only** — never a whole domain model. A route argument is serialized; a domain entity is not a transport type.

## Anti-patterns

- ❌ String routes built with `"details/$id"` interpolation
- ❌ Renaming a route class and letting its `@SerialName` drift with it
- ❌ Passing a domain entity as a route argument
