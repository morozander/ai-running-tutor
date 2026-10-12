import ComposableArchitecture

/// Leaf screen reached via a type-safe stack route carrying `id`. Behaviour is minimal (dismiss),
/// so it is a small reducer; a richer screen would grow State/Action like `HomeFeature`.
@Reducer
public struct DetailsFeature {
    @ObservableState
    public struct State: Equatable {
        public let id: String
        public init(id: String) {
            self.id = id
        }
    }

    public enum Action {
        case backTapped
    }

    @Dependency(\.dismiss) private var dismiss

    public init() {}

    public var body: some ReducerOf<Self> {
        Reduce { _, action in
            switch action {
            case .backTapped:
                return .run { _ in await dismiss() }
            }
        }
    }
}
