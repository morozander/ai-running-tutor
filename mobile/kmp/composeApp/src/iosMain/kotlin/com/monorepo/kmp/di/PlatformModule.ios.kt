package com.monorepo.kmp.di

import org.koin.core.module.Module
import org.koin.dsl.module

actual fun platformModule(): Module = module {
    // iOS infrastructure bindings go here (e.g. Darwin HTTP engine, NSUserDefaults settings).
}
