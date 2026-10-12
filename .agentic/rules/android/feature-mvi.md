---
name: android-feature-mvi
description: Feature MVI file layout — Contract (State/Intent/Effect), Screen, ViewModel
globs: ["mobile/android/features/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Feature MVI structure

Every user-facing feature in `:features` lives in its own package and has **three files**:

```
features/.../home/
  HomeContract.kt    # State + Intent + Effect
  HomeScreen.kt      # Compose UI + @Preview
  HomeViewModel.kt   # MviViewModel subclass
```

Naming: `{Feature}Contract.kt`, `{Feature}Screen.kt`, `{Feature}ViewModel.kt`. The `Home*` triad is the reference implementation.

## Contract (`{Feature}Contract.kt`)

One file with exactly three types, prefixed by the feature name:

| Type | Kind | Base |
|------|------|------|
| `{Feature}State` | `data class` with defaults | `MviState` |
| `{Feature}Intent` | `sealed interface` | `MviIntent` |
| `{Feature}Effect` | `sealed interface` | `MviEffect` |

```kotlin
data class HomeState(
    val isLoading: Boolean = true,
    val greeting: String = "",
) : MviState

sealed interface HomeIntent : MviIntent {
    data object Retry : HomeIntent
}

sealed interface HomeEffect : MviEffect {
    data class ShowError(val message: String) : HomeEffect
}
```

- Intents/Effects: `data class` when carrying a payload, `data object` otherwise.
- State holds durable UI fields only; one-shot events (navigation, snackbars, dialogs) go in Effect.
- Use the `com.monorepo.android.features.mvi` markers (`MviState` / `MviIntent` / `MviEffect`).

## ViewModel

- Extends `MviViewModel<{Feature}Intent, {Feature}State, {Feature}Effect>(initialState)`.
- Implements `onIntent` as a single exhaustive `when`; mutates via `updateState { }`, emits via `sendEffect(...)`.
- No Compose / UI code. Talks to use cases, never to a repository or data source directly.

## Screen

- Stateless Composable: `(state, onIntent) -> Unit` (plus an optional `Modifier`).
- Resolve the ViewModel with `koinViewModel()` in a thin root; keep business logic out of the UI.
- `@Preview` in the same file — see the `compose-previews` rule.

## Anti-patterns

- ❌ State/Intent/Effect split across files or nested inside the ViewModel
- ❌ Navigation or toast state living in `State` instead of `Effect`
- ❌ Skipping the Contract and inlining MVI types in the Screen/ViewModel
- ❌ A `koinViewModel()` call inside the stateless `*Screen.kt`
