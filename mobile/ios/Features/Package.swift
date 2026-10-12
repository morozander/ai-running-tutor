// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Features",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "Features", targets: ["Features"]),
    ],
    dependencies: [
        .package(path: "../Domain"),
        .package(path: "../Styleguide"),
        .package(url: "https://github.com/pointfreeco/swift-composable-architecture", from: "1.17.0"),
    ],
    targets: [
        .target(
            name: "Features",
            dependencies: [
                "Domain",
                "Styleguide",
                .product(name: "ComposableArchitecture", package: "swift-composable-architecture"),
            ],
        ),
        .testTarget(
            name: "FeaturesTests",
            dependencies: [
                "Features",
                .product(name: "ComposableArchitecture", package: "swift-composable-architecture"),
            ],
        ),
    ],
    swiftLanguageModes: [.v5],
)
