package com.monorepo.android.features

import androidx.compose.runtime.Composable
import com.monorepo.android.features.navigation.AppNavHost
import com.monorepo.android.styleguide.theme.AppTheme

/**
 * Root of the app UI: the app theme wrapping the type-safe navigation graph. Per-screen ViewModels
 * are resolved inside [AppNavHost]'s destination blocks, not here.
 */
@Composable
fun App() {
    AppTheme {
        AppNavHost()
    }
}
