---
name: ios-data-module
description: Data package — live dependency values, data sources, mappers
globs: ["mobile/ios/Data/**/*.swift"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# `Data` package

`Data` provides the **live** side of the `Domain` dependency clients and owns external data access.

## Owns

- **Live dependency values** — `extension SomeClient: @retroactive DependencyKey { static let liveValue = … }`.
- **Data sources** — URLSession/remote clients, persistence (SwiftData/CoreData/files), DTOs and mappers.
- **Mappers** — translate DTOs into `Domain` models.

## Practices

- Build the `liveValue` by composing device APIs (UIKit, CoreLocation, …) and data sources; keep DTOs `internal` — only
  `Domain` models cross the boundary.
- No UI, no business rules, no TCA reducers. There is no DI container — registration is the
  `DependencyKey` conformance.
- The app links `Data` so the live values are active; nothing else imports it.

## Anti-patterns

- ❌ Leaking a DTO or `URLResponse`-shaped type out of the package
- ❌ Business rules here (they belong on `Domain` models/free functions)
- ❌ A repository choosing its own dispatcher instead of accepting the caller's context
