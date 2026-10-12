import Testing
@testable import Domain

struct GreetingTests {
    @Test func buildsMessageFromPlatformName() {
        #expect(Greeting(platformName: "TestOS") == Greeting(message: "Hello from TestOS!"))
    }
}
