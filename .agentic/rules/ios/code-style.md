---
name: ios-code-style
description: SwiftLint, package/file conventions, and comment discipline
globs: ["mobile/ios/**/*.swift", "mobile/ios/Package.swift"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Code style

## SwiftLint

Style is enforced by **SwiftLint**, configured in `mobile/ios/.swiftlint.yml` and applied to the app
target and every package.

```bash
swiftlint          # lint (run from mobile/ios/)
swiftlint --fix    # autocorrect
swiftlint --strict # CI gate — warnings fail
```

Reformatting/autocorrect lands in its **own commit**, never mixed with behavioural change. A SwiftLint
build-tool plugin per package is an optional enhancement; the checked-in config is the source of truth.

## Conventions

- One primary type per file, file named after it. Types `UpperCamelCase`, members `lowerCamelCase`.
- Keep package public API intentional — mark `public` only what other packages/tests use.
- Swift concurrency: `async`/`await`; keep types `Sendable`; UI on the main actor.

## Comments

Don't comment types/functions/lines unless the *why* is non-obvious — one line explaining a constraint,
not a restatement of the code.

## Anti-patterns

- ❌ Force-unwrap `!` and force-try `try!` in production code
- ❌ `fatalError`/`print` left in shipping code
- ❌ A dependency version pinned inline in one package but drifting across the others
- ❌ Retroactive conformance without `@retroactive`
