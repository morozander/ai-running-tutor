---
name: ios-navigation
description: Type-safe TCA navigation — StackState + NavigationStack, delegate-driven
globs: ["mobile/ios/Features/**/*.swift"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Navigation (TCA)

Navigation is state-driven through TCA and rendered with SwiftUI `NavigationStack`. The root
`AppFeature` owns the stack; `AppView` is the reference.

## Stack-based navigation

```swift
@Reducer
public struct AppFeature {
    @ObservableState public struct State: Equatable {
        public var home = HomeFeature.State()
        public var path = StackState<DetailsFeature.State>()
    }
    public enum Action { case home(HomeFeature.Action); case path(StackActionOf<DetailsFeature>) }
    public var body: some ReducerOf<Self> {
        Scope(state: \.home, action: \.home) { HomeFeature() }
        Reduce { state, action in
            switch action {
            case let .home(.delegate(.openDetails(id))): state.path.append(DetailsFeature.State(id: id)); return .none
            case .home, .path: return .none
            }
        }
        .forEach(\.path, action: \.path) { DetailsFeature() }
    }
}
```

`AppView` binds the stack: `NavigationStack(path: $store.scope(state: \.path, action: \.path)) { HomeView(...) } destination: { DetailsView(store: $0) }`.

## Rules

- A child screen requests navigation by emitting a `delegate` action; the **parent** mutates the stack.
  A screen never pushes/pops another screen itself.
- Route arguments carry **ids / display hints only** (they live in the pushed feature's `State`), never
  a whole domain model.
- Dismiss from a pushed screen with `@Dependency(\.dismiss)`.
- For modals/alerts, prefer `@Presents` + `.ifLet`/`.sheet(item:)` over boolean flags.

## Anti-patterns

- ❌ A `Bool`/optional "isShowingX" flag in State driving navigation instead of `StackState`/`@Presents`
- ❌ A child reaching into the parent's navigation state
- ❌ Passing a domain entity as a route argument
