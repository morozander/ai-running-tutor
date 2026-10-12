import ComposableArchitecture

/// Root reducer composing the app's navigation — the iOS analog of `AppNavHost`. Home's
/// `delegate(.openDetails)` pushes a `DetailsFeature` onto a type-safe navigation stack.
@Reducer
public struct AppFeature {
    @ObservableState
    public struct State: Equatable {
        public var home = HomeFeature.State()
        public var path = StackState<DetailsFeature.State>()
        public init() {}
    }

    public enum Action {
        case home(HomeFeature.Action)
        case path(StackActionOf<DetailsFeature>)
    }

    public init() {}

    public var body: some ReducerOf<Self> {
        Scope(state: \.home, action: \.home) {
            HomeFeature()
        }
        Reduce { state, action in
            switch action {
            case let .home(.delegate(.openDetails(id))):
                state.path.append(DetailsFeature.State(id: id))
                return .none

            case .home, .path:
                return .none
            }
        }
        .forEach(\.path, action: \.path) {
            DetailsFeature()
        }
    }
}
