package com.monorepo.kmp

import android.app.Application
import com.monorepo.kmp.di.initKoin
import org.koin.android.ext.koin.androidContext

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        initKoin { androidContext(this@MainApplication) }
    }
}
