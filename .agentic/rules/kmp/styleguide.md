---
name: kmp-styleguide
description: Styleguide owns the app theme, design tokens, and shared UI components
globs: ["mobile/kmp/styleguide/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# `:styleguide` module

Owns the app theme and common UI components for Compose Multiplatform.

## Owns

- Color scheme, typography, shapes, spacing tokens.
- `AppTheme` wrapping Material 3; token accessors alongside it.
- Reusable components (buttons, text fields, app bars, list items, dialogs).

## Does not own

- Feature screens or feature ViewModels (those live in `:features`).
- Platform SDKs / device APIs (those live in `:platform`).
- App navigation graphs.

## Practices

- Add Compose Multiplatform + Material 3 deps here when building the design system.
- `AppTheme` wraps its content in a `Surface` painted with `MaterialTheme.colorScheme.background`, so screens and `@Preview`s render on a real surface rather than a transparent canvas.
- Every public component ships with a `@Preview` in the **same file** — see `compose-previews`.
- Prefer tokens/theme over hardcoded colors/sizes in components. A raw `Color(0xFF…)` or magic `.dp` in a screen is the anti-pattern — the token layer exists so screens don't restate brand values.
- Align with Material 3 (Android/Compose) and adapt density/accessibility for iOS hosting.
- `:features` consumes `:styleguide`; `:styleguide` must never depend on `:features`.

```kotlin
@Composable
fun AppPrimaryButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) { /* ... */ }

@Preview
@Composable
private fun AppPrimaryButtonPreview() {
    AppTheme { AppPrimaryButton(label = "Continue", onClick = {}) }
}
```
