---
name: mobile-observability
description: Crash reporting — the only production visibility a store app has
globs: ["mobile/expo-boilerplate/app/_layout.tsx", "mobile/expo-boilerplate/src/api/**/*"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Mobile Observability

Mobile counterpart to [backend/opentelemetry.md](../backend/opentelemetry.md). A store app has no server logs to tail — **crash reporting is the only production visibility**. The cautionary tale from company code: a production app reached v56 with `SENTRY_DSN` typed in its config and no SDK installed — dead config, flying blind in the stores.

Vendor-agnostic rules (Sentry is the company-proven choice):

- **WHEN the app ships to stores** → wire crash reporting **before the first release**, initialized at the app entry (root `_layout.tsx`, THIS repo) so crashes during startup are caught too.
- **Release identity comes from the native binary, never hardcoded** — derive `release`/`dist` from the installed build (`expo-application`'s `nativeApplicationVersion` / `nativeBuildVersion`, THIS repo) and `environment` from env config. Hardcoded versions make reports un-attributable to a build.
- **WHEN reporting GraphQL errors from the Apollo error link** → attach `operationName` + serialized `variables` as context; a bare "GraphQL error" report is unactionable.
- **WHEN third-party noise floods the quota** → `beforeSend` filter against a known-messages ignore list, **not** sampling — sampling drops your real crashes along with the noise.
- **Wire the navigation integration** so crashes carry screen breadcrumbs — "crashed on Profile after Checkout" beats a bare stack trace.
- **Prune observability config with the code** — a DSN or var nothing consumes is dead config (the v56 anti-example above); delete it or wire it.
