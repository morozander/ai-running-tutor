---
name: kmp-resources
description: Compose Multiplatform resource management (strings, drawables, fonts)
globs: ["mobile/kmp/**/*.kt", "mobile/kmp/**/src/commonMain/composeResources/**"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Resource management

Use Compose Multiplatform's built-in resource system to share UI assets across Android and iOS natively.

## The `Res` class

- **Usage**: always access resources through the generated `Res` class (e.g. `Res.string.home_title`, `Res.drawable.ic_logo`).
- **Placement**: global assets (shared strings, drawables, fonts) live in the `commonMain/composeResources` directory of `:styleguide`; feature-exclusive content lives in that `:features` module.

## Practices

- **No hardcoded strings**: never hardcode user-facing text in Composables. Define it in `strings.xml` and read it via `stringResource(Res.string.key)`.
- **Vector graphics**: prefer Material Symbols or Android XML vector drawables over rasterized images (PNG/JPEG) for better cross-platform scaling.
- **Fonts**: store custom fonts in the multiplatform resources directory and load them through the generated accessors.
- **Stable Res package**: set `compose.resources { packageOfResClass = "..." }` per module so the generated import is deterministic (the template pins `com.monorepo.kmp.features.resources`).
