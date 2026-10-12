---
name: kmp-code-style
description: ktlint, package/directory mirroring, the version catalog, and comment discipline
globs: ["mobile/kmp/**/*.kt", "mobile/kmp/gradle/libs.versions.toml"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Code style

## ktlint

`ktlint_official` style, configured in `mobile/kmp/.editorconfig` and applied to every subproject.

```bash
./gradlew ktlintCheck
./gradlew ktlintFormat
```

One configuration detail is load-bearing: `ktlint_function_naming_ignore_when_annotated_with = Composable` — Compose functions are PascalCase by convention and would otherwise fail function-naming.

Reformatting lands in its **own commit**, never mixed with behavioural change.

## Packages mirror directories

A new file declares the package matching its directory, and a new directory gets its own package.

One top-level type per file, file named after it.

## Dependencies go through the version catalog

Always `libs.foo.bar` from `gradle/libs.versions.toml` — never a literal coordinate in a module build file.

**The catalog's comments are load-bearing.** They record why each pin is what it is — e.g. Compose Multiplatform and lifecycle must move together or iOS fails with `IrLinkageError`. Read them before bumping anything, and never bump one of a coupled set in isolation.

## Comments

Don't comment methods, classes or lines unless the *why* is non-obvious. The house style is one line explaining a constraint — often a version-compatibility or platform reason. Code that explains itself gets no comment.

## Anti-patterns

- ❌ `!!`
- ❌ `runBlocking` in production code
- ❌ `GlobalScope`
- ❌ Catching bare `Exception` across a cancellation path without re-checking `ensureActive()`
- ❌ A dependency coordinate written literally instead of through the catalog
