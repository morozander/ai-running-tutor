# Maestro E2E flows

Persisted, reusable [Maestro](https://maestro.mobile.dev) flows that drive the app's primary user
journeys on a real Android emulator / iOS simulator. They are the runtime-smoke verifier's **mobile
E2E driving layer** — declarative `.yaml`, element selection by testTag-id / visible text, built-in
auto-wait — replacing fragile `adb input tap <x> <y>` pixel coordinates.

> **Template scaffold.** `journeys/home.yaml` is a real, runnable journey against the template's
> `HomeScreen`.

## Layout

```
.maestro/
├── subflows/            reusable building blocks composed via `runFlow` (add when journeys share steps)
└── journeys/            one file per user journey (committed, reused across runs)
```

Flows are **committed deliverables**, like tests — not regenerated each run. A journey is authored
once (by whoever adds the feature, or by the verifier if missing), then only *run* on later passes
and *edited* when the UI genuinely changes.

### Naming — cross-platform by default

A journey with **no platform prefix** (`journeys/<slug>.yaml`, e.g. `home.yaml`) runs on **both**
Android and iOS — the runner executes it on every in-scope platform. This works because selectors are
testTag **ids** (which resolve as `resource-id` on both) or **visible text**, and all strings come from
one shared `composeResources` table, so a well-authored flow is genuinely platform-neutral.

A **platform prefix** is reserved for a scenario that can only run on one platform because it needs a
capability the other can't drive — e.g. `android-<slug>.yaml` for a flow that toggles airplane mode via
`adb` (no `simctl` equivalent). State each platform-only file's reason in its header comment.

## Selectors — testTag → `resource-id`

- **Android**: expose testTags app-wide with `Modifier.semantics { testTagsAsResourceId = true }` on a
  root composable (or set it in `MainActivity`). Without it, `id:` selectors won't resolve on Android.
- **iOS**: `Modifier.testTag(...)` surfaces to Maestro's `id:` selectors with no extra config.
- A control with neither a testTag nor stable visible text is an accessibility gap — add a
  `Modifier.testTag(...)` rather than tapping a guessed pixel.

## Running

Install Maestro if missing: `curl -Ls https://get.maestro.mobile.dev | bash` (needs a JDK); ensure
`~/.maestro/bin` is on `PATH`.

Android and iOS share the bundle id / applicationId `com.monorepo.kmp`, so one prefix-less journey
(a single `appId`) drives both. `journeys/home.yaml` selects by **visible text**, so it needs no
Android `testTagsAsResourceId` opt-in.

```bash
# Android — build + install on a booted emulator, then run the flow
cd mobile/kmp && ./gradlew :androidApp:installDebug
maestro test .maestro/journeys/home.yaml

# iOS — build for a booted simulator, install, then run the same flow (Maestro-for-iOS is sim-only)
SIM=$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)
xcodebuild -project iosApp/iosApp.xcodeproj -scheme iosApp -configuration Debug \
  -sdk iphonesimulator -destination "id=$SIM" -derivedDataPath /tmp/iosbuild \
  CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "$SIM" /tmp/iosbuild/Build/Products/Debug-iphonesimulator/Kmp.app
maestro --device "$SIM" test .maestro/journeys/home.yaml
```

> Verified green on both an Android emulator and an iPhone simulator: launch → Home → Open details
> → back to Home.

## Authoring conventions (Compose gotchas)

- **Never `hideKeyboard` on Android** — Maestro presses BACK and can pop the screen. Dismiss the IME
  with `pressKey: Enter` on a Done field (on iOS `hideKeyboard` is safe).
- **Controls under a bottom nav bar** aren't hittable even when "visible" → `scrollUntilVisible` with
  `centerElement: true` first (no such quirk on iOS).
- **`Dialog`/popup = separate composition root.** A root `testTagsAsResourceId` does not reach inside it
  — match dialog controls by text, or add a dialog-local `semantics { testTagsAsResourceId = true }`.
- **Buttons gated on async load** stay disabled briefly → wait for `enabled: true` (needs the tag
  exposed) or tap-until-the-dialog-closes.

## Recordings

Recordings are **not** kept for passing runs — the step log is the evidence, and `*.mp4/webm/gif/mov`
are gitignored. Capture a video only to debug a failing flow; Maestro also writes per-step
screen-hierarchy dumps under `~/.maestro/tests/<ts>/`.
