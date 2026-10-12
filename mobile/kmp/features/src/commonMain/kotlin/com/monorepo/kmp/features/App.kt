package com.monorepo.kmp.features

import androidx.compose.runtime.Composable
import com.monorepo.kmp.features.navigation.AppNavHost
import com.monorepo.kmp.styleguide.theme.AppTheme

/**
 * Root of the shared UI: the app theme wrapping the type-safe navigation graph. Per-screen
 * ViewModels are resolved inside [AppNavHost]'s destination blocks, not here.
 */
@Composable
fun App() {
    AppTheme {
        AppNavHost()
    }
}
