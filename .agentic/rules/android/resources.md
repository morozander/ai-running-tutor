---
name: android-resources
description: Android resource management (strings, drawables, fonts) via the R class
globs: ["mobile/android/**/*.kt", "mobile/android/**/src/main/res/**"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Resource management

Use Android resources with the generated `R` class, read in Compose via `androidx.compose.ui.res.*`.

## Placement

- **Strings** in `<module>/src/main/res/values/strings.xml`, read with `stringResource(R.string.key)` (use the owning module's `R`, e.g. `com.monorepo.android.features.R`).
- **Drawables** in `res/drawable/` (prefer vector XML / Material Symbols over PNG/JPEG); read with `painterResource(R.drawable.key)`.
- Feature-specific resources live in that `:features` module; shared/global assets live in `:styleguide`.

## Practices

- **No hardcoded user-facing strings** in Composables — define them in `strings.xml` and read them via `stringResource`. Use format args (`stringResource(R.string.details_title, id)`) rather than string concatenation.
- **Vector graphics** scale cleanly — prefer them for icons.
- **Fonts** go in `res/font/` and load via a `FontFamily` in `:styleguide`'s typography.
