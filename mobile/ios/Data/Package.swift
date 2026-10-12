// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Data",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "Data", targets: ["Data"]),
    ],
    dependencies: [
        .package(path: "../Domain"),
        .package(url: "https://github.com/pointfreeco/swift-dependencies", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "Data",
            dependencies: [
                "Domain",
                .product(name: "Dependencies", package: "swift-dependencies"),
            ],
        ),
    ],
    swiftLanguageModes: [.v5],
)
