package com.monorepo.kmp

import androidx.compose.ui.window.ComposeUIViewController
import com.monorepo.kmp.di.initKoin
import com.monorepo.kmp.features.App

// Entry point consumed by the Swift host (see iosApp/). Koin is started lazily and idempotently
// on first controller creation.
fun MainViewController() =
    ComposeUIViewController(configure = { initKoin() }) { App() }
