/// Sample domain entity. Domain rules live on the model (or free functions) — TCA has no separate
/// "use case" layer; reducers compose dependency clients and domain types directly.
public struct Greeting: Equatable, Sendable {
    public let message: String

    public init(message: String) {
        self.message = message
    }

    /// The app's greeting rule.
    public init(platformName: String) {
        self.message = "Hello from \(platformName)!"
    }
}
