import Dependencies
import Domain
#if canImport(UIKit)
import UIKit
#endif

/// The live implementation of the `:Domain` dependency client. This is the interface/live split:
/// `:Domain` declares `TestDependencyKey` (testValue), `:Data` adds the `DependencyKey` (liveValue).
/// The app links `:Data` so the live value is used at runtime. Device APIs (UIKit) are read here in
/// the data/infra layer — the app has no separate `:Platform` package.
extension PlatformInfoClient: @retroactive DependencyKey {
    public static let liveValue = PlatformInfoClient(
        platformName: {
            #if canImport(UIKit)
            return await MainActor.run { "iOS \(UIDevice.current.systemVersion)" }
            #else
            return "unknown"
            #endif
        },
    )
}
