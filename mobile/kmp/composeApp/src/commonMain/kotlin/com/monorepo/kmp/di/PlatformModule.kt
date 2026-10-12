package com.monorepo.kmp.di

import org.koin.core.module.Module

/**
 * Platform-specific bindings (HTTP engine, DB driver, session persistence, native SDK bridges)
 * are supplied per target. Declare the `expect` here; provide `actual`s in androidMain / iosMain.
 */
expect fun platformModule(): Module
