import ComposableArchitecture
import Styleguide
import SwiftUI

public struct DetailsView: View {
    let store: StoreOf<DetailsFeature>

    public init(store: StoreOf<DetailsFeature>) {
        self.store = store
    }

    public var body: some View {
        VStack(spacing: AppSpacing.screen) {
            Text("Details for \(store.id)")
                .font(.title)
                .accessibilityIdentifier("details-title")

            PrimaryButton("Back") { store.send(.backTapped) }
        }
        .padding()
        .screenBackground()
        .navigationTitle("Details")
    }
}
