---
name: android-platform-best-practices
description: Official Google / Android best practices for the app
globs: ["mobile/android/**/*.kt"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Android best practices

Follow official Google recommendations; prefer documented Jetpack APIs over ad-hoc workarounds.

- **Modern APIs** — AndroidX, Jetpack, Compose, Material 3. Avoid deprecated framework APIs.
- **Permissions** — request runtime permissions for hardware and sensitive access (location, camera, Bluetooth, notifications) per current Android docs; declare every one in the manifest.
- **Background work** — use WorkManager / coroutines; foreground services only when required, within current background-execution limits.
- **Edge-to-edge** — draw behind the system bars (the host `MainActivity` calls `enableEdgeToEdge()`); handle insets with `safeContentPadding` / `WindowInsets`.
- **Lifecycle** — collect flows with `collectAsStateWithLifecycle`; never leak coroutines past a scope.
- **Accessibility** — content descriptions on meaningful icons/controls, sufficient contrast, adequate touch targets.
- **Configuration changes** — survive rotation and process death; hoist durable state into the ViewModel and restore route arguments via type-safe navigation.
- **Keep `:app` thin** — OS capabilities live in `:platform`, shared UI in `:styleguide` / `:features`. Do not bypass module boundaries to "make it work".
