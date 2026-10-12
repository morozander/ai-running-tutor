import Dependencies

/// The repository analog, expressed as a TCA dependency client (a struct of closures) rather than a
/// protocol. The interface + `testValue` live here in :Domain; the `liveValue` lives in :Data
/// (`TestDependencyKey` here, `DependencyKey` there — the interface/live split).
public struct PlatformInfoClient: Sendable {
    public var platformName: @Sendable () async -> String

    public init(platformName: @escaping @Sendable () async -> String) {
        self.platformName = platformName
    }
}

extension PlatformInfoClient: TestDependencyKey {
    public static let testValue = PlatformInfoClient(platformName: { "TestOS" })
}

public extension DependencyValues {
    var platformInfo: PlatformInfoClient {
        get { self[PlatformInfoClient.self] }
        set { self[PlatformInfoClient.self] = newValue }
    }
}
