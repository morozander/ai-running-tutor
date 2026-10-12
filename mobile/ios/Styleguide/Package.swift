// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Styleguide",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "Styleguide", targets: ["Styleguide"]),
    ],
    targets: [
        .target(name: "Styleguide"),
    ],
    swiftLanguageModes: [.v5],
)
