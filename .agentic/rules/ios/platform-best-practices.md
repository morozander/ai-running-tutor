---
name: ios-platform-best-practices
description: Official Apple / iOS best practices for the app
globs: ["mobile/ios/**/*.swift"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Apple / iOS best practices

Follow the Human Interface Guidelines and Apple's documented APIs; prefer first-party frameworks over
workarounds.

- **SwiftUI-first** — modern SwiftUI + `@Observable`/TCA observation; avoid deprecated UIKit patterns unless bridging.
- **Privacy** — an `Info.plist` usage description for every capability (`NSCameraUsageDescription`,
  `NSLocationWhenInUseUsageDescription`, etc.); privacy manifest where required; request permission in context.
- **Concurrency** — `async`/`await` and structured concurrency; keep UI work on the main actor.
- **Layout** — respect safe areas and Dynamic Type; support light/dark and accessibility (VoiceOver labels, contrast, hit targets).
- **Lifecycle** — drive effects from `.task`/TCA effects; cancel work when a feature leaves the stack.
- **Keep the app target thin** — device APIs in `Data` (behind a dependency client), shared UI in `Styleguide`/`Features`. Don't bypass package boundaries.
