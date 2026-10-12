---
name: ios-styleguide
description: Styleguide package — theme tokens and reusable SwiftUI components
globs: ["mobile/ios/Styleguide/**/*.swift"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# `Styleguide` package

Owns the app's visual language: design tokens and reusable SwiftUI components.

## Owns

- Tokens — `AppColor`, `AppSpacing` (and later typography/shapes). Cross-platform colors (no UIKit) so the package builds on the host.
- Reusable components — e.g. `PrimaryButton`, plus view modifiers like `screenBackground()`.

## Does not own

- Feature screens or reducers (those live in `Features`).
- Device APIs (those live in `Data`, behind a `@Dependency` client).

## Practices

- Features consume tokens/components instead of hardcoding colors/spacing. A raw `Color(red:…)` or a
  magic padding value in a feature view is the anti-pattern — add/use a token.
- Every public component ships a `#Preview` in the same file.
- `Styleguide` must never depend on `Features`.

```swift
public enum AppColor { public static let primary = Color(red: 0.40, green: 0.31, blue: 0.64) }
public struct PrimaryButton: View { /* … */ }
```
