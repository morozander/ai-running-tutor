# mobile/kmp

A Kotlin/Compose Multiplatform **template** targeting Android and iOS. It is a structural
scaffold — layered modules, an MVI base, Koin DI, and a single end-to-end sample slice — not a
finished app, and independent of the Expo app in [`../mobile`](../mobile).

Package root: `com.monorepo.kmp`. AI-agent context: [`.agentic/packages/kmp.md`](../.agentic/packages/kmp.md),
rules under [`.agentic/rules/kmp/`](../.agentic/rules/kmp).

## Modules

| Module | Owns |
|---|---|
| `:androidApp` | Thin Android host — `MainActivity`, `MainApplication`, manifest, launcher res (`com.android.application`) |
| `:composeApp` | Koin composition (`di/`), app wiring, iOS `MainViewController`, produces the `ComposeApp` framework (KMP library) |
| `:domain` | Models, repository interfaces, use cases, `Resource<T>`/`ErrorType`. Pure Kotlin base layer — no framework deps |
| `:data` | Repository implementations, DTOs, mappers |
| `:platform` | OS capabilities / device APIs behind common Kotlin interfaces (`expect`/`actual`) |
| `:styleguide` | `AppTheme`, design tokens, reusable UI components |
| `:features` | All Compose UI, ViewModels, navigation, the MVI base (`mvi/`) |
| `iosApp` | Swift host linking the `ComposeApp` framework |

## MVI

Screens are a `Contract` / `Screen` / `ViewModel` triad, with the `@Preview` colocated in the
screen file. The base types live in `features/.../mvi/` (`MviState`, `MviIntent`, `MviEffect`,
`MviViewModel`); the `Home*` triad under `home/` is the reference implementation. See
[`feature-mvi`](../.agentic/rules/kmp/feature-mvi.md).

## The sample slice

`ObserveGreetingUseCase` → `PlatformInfoRepository` (interface) → `PlatformInfoRepositoryImpl` →
`currentPlatform()` `expect`/`actual` → `HomeViewModel` → stateless `HomeScreen`, composed in
`appModule` and hosted by `App()`. It exists to demonstrate every layer and the MVI contract in
one working path — grow it or delete it.

## Running

- Android app: `./gradlew :androidApp:assembleDebug`
- iOS app: open [`/iosApp`](./iosApp) in Xcode and run, or run the composeApp iOS target from the IDE
- Tests: `./gradlew testAndroidHostTest` (JVM); `./gradlew :features:iosSimulatorArm64Test` for the Kotlin/Native side
- Lint: `./gradlew ktlintCheck` / `./gradlew ktlintFormat`

> Verified to build: `:androidApp:assembleDebug`, `:features:testAndroidHostTest`, and the iOS
> framework (`:composeApp:linkDebugFrameworkIosSimulatorArm64`) all pass on JDK 21 + the pinned
> Gradle/AGP. Open in Android Studio / IntelliJ and let Gradle sync on first checkout.

Learn more about [Kotlin Multiplatform](https://www.jetbrains.com/help/kotlin-multiplatform-dev/get-started.html).
