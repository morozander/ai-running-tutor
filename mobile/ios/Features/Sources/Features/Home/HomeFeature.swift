import ComposableArchitecture
import Domain

/// TCA reducer for the Home screen. State is
/// observable UI state; one-shot navigation is emitted through a `delegate` action the parent
/// (`AppFeature`) handles. Talks to a `:Domain` dependency client, never to `:Data` directly.
@Reducer
public struct HomeFeature {
    @ObservableState
    public struct State: Equatable {
        public var isLoading = true
        public var greeting = ""
        public init() {}
    }

    public enum Action {
        case task
        case retryTapped
        case openDetailsTapped
        case greetingResponse(Greeting)
        case delegate(Delegate)

        @CasePathable
        public enum Delegate: Equatable {
            case openDetails(id: String)
        }
    }

    @Dependency(\.platformInfo) private var platformInfo

    public init() {}

    public var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .task, .retryTapped:
                state.isLoading = true
                return .run { send in
                    let name = await platformInfo.platformName()
                    await send(.greetingResponse(Greeting(platformName: name)))
                }

            case let .greetingResponse(greeting):
                state.isLoading = false
                state.greeting = greeting.message
                return .none

            case .openDetailsTapped:
                return .send(.delegate(.openDetails(id: "ios-42")))

            case .delegate:
                return .none
            }
        }
    }
}
