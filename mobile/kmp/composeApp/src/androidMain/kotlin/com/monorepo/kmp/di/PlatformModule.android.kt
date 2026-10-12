package com.monorepo.kmp.di

import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformModule(): Module = module {
    // Android infrastructure bindings go here (e.g. OkHttp engine, Android context providers).
}
