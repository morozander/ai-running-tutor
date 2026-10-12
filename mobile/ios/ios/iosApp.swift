//
//  iosApp.swift
//  ios
//

import ComposableArchitecture
import Data
import Features
import SwiftUI

@main
struct iosApp: App {
    var body: some Scene {
        WindowGroup {
            AppView(
                store: Store(initialState: AppFeature.State()) {
                    AppFeature()
                },
            )
        }
    }
}
