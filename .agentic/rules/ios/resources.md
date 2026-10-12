---
name: ios-resources
description: iOS resources — asset catalogs, localized strings, SF Symbols
globs: ["mobile/ios/**/*.swift", "mobile/ios/**/*.xcassets/**", "mobile/ios/**/*.xcstrings"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Resource management

- **Strings** — user-facing copy belongs in a String Catalog (`.xcstrings`) / `Localizable`, read via
  `String(localized:)` or SwiftUI's `Text("key")`. Avoid hardcoded display strings in shipping screens
  (the sample template uses literals for brevity; real features localize).
- **Images/colors** — asset catalogs; prefer **SF Symbols** (`Image(systemName:)`) and vector assets
  over rasterized images. Brand colors live as `:Styleguide` tokens, not scattered `Color(...)` literals.
- **Per-package resources** — a package that ships assets declares `resources:` in its target and reads
  them from `Bundle.module`. Global/brand assets live in `:Styleguide`; feature-specific ones in `Features`.
- **App icons / accent** — in the app target's `Assets.xcassets`.
