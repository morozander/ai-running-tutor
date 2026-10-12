import ComposableArchitecture
import SwiftUI

/// Root view: a type-safe TCA navigation stack. The Xcode app target builds a `StoreOf<AppFeature>`
/// and shows this.
public struct AppView: View {
    @Bindable var store: StoreOf<AppFeature>

    public init(store: StoreOf<AppFeature>) {
        self.store = store
    }

    public var body: some View {
        NavigationStack(path: $store.scope(state: \.path, action: \.path)) {
            HomeView(store: store.scope(state: \.home, action: \.home))
        } destination: { store in
            DetailsView(store: store)
        }
    }
}
