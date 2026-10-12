# Maestro E2E flows

Persisted, reusable [Maestro](https://maestro.mobile.dev) flows that drive the app's primary user
journeys on an Android emulator/device. They are the runtime-smoke verifier's **E2E driving layer** —
declarative `.yaml`, element selection by testTag-id / visible text, built-in auto-wait — replacing
fragile `adb input tap <x> <y>` pixel coordinates.

This is an **Android-only** app, so every journey is Android; there is no iOS/cross-platform split.

## Layout

```
.maestro/
├── subflows/   reusable building blocks composed via `runFlow` (add when journeys share steps)
└── journeys/   one file per user journey (committed, reused across runs)
```

Flows are **committed deliverables**, like tests — authored once, then only run and edited when the
UI genuinely changes. `journeys/home.yaml` (launch → Home → Open details → back) is the reference.

## Selectors

`journeys/home.yaml` selects by **visible text**, which works with no extra config. To select by
testTag **id** on Android, expose ids as resource-id with `Modifier.semantics { testTagsAsResourceId = true }`
on a root composable; the controls already carry `Modifier.testTag(...)`.

## Running

Install Maestro if missing: `curl -Ls https://get.maestro.mobile.dev | bash` (needs a JDK); ensure
`~/.maestro/bin` is on `PATH`.

```bash
# build + install on a booted emulator, then run the flow
cd mobile/android && ./gradlew :app:installDebug
maestro test .maestro/journeys/home.yaml
```

> Verified green on an Android emulator: launch → Home → Open details → back to Home.

## Authoring conventions (Compose gotchas)

- **Never `hideKeyboard`** — Maestro presses BACK and can pop the screen. Dismiss the IME with
  `pressKey: Enter` on a Done field.
- **Controls under a bottom nav bar** aren't hittable even when "visible" → `scrollUntilVisible` with
  `centerElement: true` first.
- **`Dialog`/popup = separate composition root.** Match dialog controls by text, or add a
  dialog-local `semantics { testTagsAsResourceId = true }`.
- Recordings (`*.mp4/webm/gif`) are gitignored — capture only to triage a failing run.
