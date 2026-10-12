# Mobile-iOS Package — AI Context

Native **iOS** app (SwiftUI + **The Composable Architecture**) — a structural template with layered
Swift packages, TCA feature reducers, type-safe navigation, and an end-to-end sample slice.

**Xcode + Swift Package Manager build.** Bundle id / package root `com.monorepo.ios`.

## Stack

- **Swift 6 toolchain** (Xcode 26), SwiftUI, iOS 17+; packages build in Swift 5 language mode
- **The Composable Architecture** (`swift-composable-architecture`) for features — `@Reducer` + `@ObservableState`, `Store`, `TestStore`
- **swift-dependencies** (`@Dependency`) for DI — interface/live split across `:Domain`/`:Data`
- **SwiftLint** (`.swiftlint.yml` at the root) for style
- **Swift Testing** (`@Test`) + TCA `TestStore` — no mocking framework, hand-written dependency values

## Packages

Four local Swift packages (each its own `Package.swift`, wired by `path`) + the Xcode app target `ios`.
All four are added to the project as local package references (visible/editable in the navigator); the
app target links the `Features` + `Data` products.

```
mobile/ios/
├── ios.xcodeproj          app host (target "ios") — links Features + Data
├── ios/                   iosApp.swift: builds StoreOf<AppFeature> and shows AppView
├── Domain/                models (with their rules, e.g. Greeting(platformName:)), Resource, PlatformInfoClient (dependency interface + testValue)
├── Data/                  live dependency values — PlatformInfoClient.liveValue (DependencyKey); reads device APIs (UIDevice)
├── Styleguide/            AppColor/AppSpacing tokens, reusable SwiftUI components (PrimaryButton), screenBackground()
└── Features/              TCA: HomeFeature/HomeView, DetailsFeature/DetailsView, AppFeature/AppView (navigation)
```

> No `Platform` package: on a single-platform app the `@Dependency` client *is* the device abstraction,
> so device/OS APIs are read inside the client's `liveValue` in `Data`, behind the `Domain` interface.

## Dependency direction

```
app (ios) ──► Features, Data          (links Data so the live DependencyKey is registered)
Features ──► Domain, Styleguide, ComposableArchitecture   (never Data)
Data ──► Domain (+ UIKit / device frameworks)
Domain ──► swift-dependencies          (pure domain + the dependency-client interface)
```

`Features` reaches data only through a `:Domain` dependency client (`@Dependency`), never `:Data`. The
**interface/live split**: `:Domain` declares the client + `testValue` (`TestDependencyKey`); `:Data`
adds `liveValue` (`DependencyKey`); the app links `:Data` so the live value is used at runtime.

## The sample slice

`HomeFeature` (TCA reducer) resolves `@Dependency(\.platformInfo)` (a `Domain` client whose `liveValue`
in `Data` reads `UIDevice`), builds a `Greeting(platformName:)` (the domain rule lives on the model —
no use-case layer), renders via `HomeView`, and emits `delegate(.openDetails)` that `AppFeature` turns
into a type-safe navigation-stack push to `DetailsFeature`. A Maestro journey (`.maestro/journeys/home.yaml`) drives it.

## Conventions

Full rules under [`.agentic/rules/ios/`](../rules/ios). Highlights: TCA `Contract`-style
Reducer/View/Feature per screen, DI via `@Dependency` only, SwiftUI `#Preview` colocated, theme/components
in `:Styleguide`, device APIs read in `:Data` behind a `@Dependency` client (never called from `:Features`), type-safe TCA
navigation, SwiftLint, and Swift Testing + `TestStore`.

## Building (headless)

Drop `-sdk iphonesimulator` (use `-destination` only) so TCA macro plugins build for the host, and pass
`-skipMacroValidation`:

```bash
xcodebuild -project ios.xcodeproj -scheme ios -configuration Debug \
  -destination 'platform=iOS Simulator,id=<UDID>' -skipMacroValidation CODE_SIGNING_ALLOWED=NO build
```

Per-package logic builds/tests with `swift build` / `swift test` (packages add a `.macOS` platform so
they compile on the host).
