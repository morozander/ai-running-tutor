// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Domain",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "Domain", targets: ["Domain"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-dependencies", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "Domain",
            dependencies: [
                .product(name: "Dependencies", package: "swift-dependencies"),
            ],
        ),
        .testTarget(name: "DomainTests", dependencies: ["Domain"]),
    ],
    swiftLanguageModes: [.v5],
)
