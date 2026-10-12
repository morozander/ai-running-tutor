import ComposableArchitecture
import Styleguide
import SwiftUI

/// Stateless-ish SwiftUI view driven by a `StoreOf<HomeFeature>`. No business logic — it renders
/// `store` state and sends actions. The store is created by the parent (`AppView`/NavHost analog).
public struct HomeView: View {
    @Bindable var store: StoreOf<HomeFeature>

    public init(store: StoreOf<HomeFeature>) {
        self.store = store
    }

    public var body: some View {
        VStack(spacing: AppSpacing.screen) {
            Text("iOS App")
                .font(.title)

            if store.isLoading {
                ProgressView()
                Text("Loading…")
            } else {
                Text(store.greeting)
                    .accessibilityIdentifier("home-greeting")
            }

            PrimaryButton("Retry") { store.send(.retryTapped) }
            PrimaryButton("Open details") { store.send(.openDetailsTapped) }
        }
        .padding()
        .screenBackground()
        .navigationTitle("Home")
        .task { store.send(.task) }
    }
}
