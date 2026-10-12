---
name: kmp-compose-previews
description: Compose screens must include @Preview in the same file
globs: ["mobile/kmp/features/**/*.kt", "mobile/kmp/styleguide/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Screens and Compose previews

Each screen Composable should have a `@Preview` in the **same file** (see `HomeScreen.kt`). Use `androidx.compose.ui.tooling.preview.Preview` from the `org.jetbrains.compose.ui:ui-tooling-preview` (`libs.compose.uiToolingPreview`) artifact — it provides the annotation for `commonMain`.

```kotlin
@Composable
fun HomeScreen(state: HomeState, onIntent: (HomeIntent) -> Unit) { /* ... */ }

@Preview
@Composable
private fun HomeScreenPreview() {
    AppTheme {
        HomeScreen(state = HomeState(), onIntent = {})
    }
}
```

## Rules

- Colocate the preview with the screen; do not create a separate `*Preview.kt` unless the preview cannot live in the same file (e.g. it needs a platform-only API).
- Wrap the preview in the `:styleguide` theme (`AppTheme`), not a one-off `MaterialTheme`.
- Provide at least one useful state (default / loading / error) when the screen has meaningful variants.
- Keep screen files focused: UI + preview; MVI types and the ViewModel live nearby in the feature package, never in `:styleguide`.
- Reuse `:styleguide` components; do not duplicate buttons/colors in feature screens.
