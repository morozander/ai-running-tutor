import Foundation

/// Wrapper for observed/loaded state. One-shot operations use `Result` or `throws` instead —
/// the two are not interchangeable.
public enum Resource<Value: Sendable>: Sendable {
    case loading
    case success(Value)
    case failure(message: String)
}
