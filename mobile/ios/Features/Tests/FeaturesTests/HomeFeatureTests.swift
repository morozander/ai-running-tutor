import ComposableArchitecture
import Domain
import Testing
@testable import Features

@MainActor
struct HomeFeatureTests {
    @Test func loadsGreetingFromPlatform() async {
        let store = TestStore(initialState: HomeFeature.State()) {
            HomeFeature()
        } withDependencies: {
            $0.platformInfo.platformName = { "TestOS" }
        }

        await store.send(.task)
        await store.receive(\.greetingResponse) {
            $0.isLoading = false
            $0.greeting = "Hello from TestOS!"
        }
    }

    @Test func openDetailsEmitsDelegate() async {
        let store = TestStore(initialState: HomeFeature.State()) {
            HomeFeature()
        }
        store.exhaustivity = .off

        await store.send(.openDetailsTapped)
        await store.receive(\.delegate.openDetails)
    }
}
