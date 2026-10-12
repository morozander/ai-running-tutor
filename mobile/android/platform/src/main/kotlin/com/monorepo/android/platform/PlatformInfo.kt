package com.monorepo.android.platform

import android.os.Build

/**
 * A cross-cutting device capability exposed behind a small facade. The interface keeps callers
 * (e.g. :data) off the Android SDK; the implementation is bound in :app's Koin module.
 */
interface PlatformInfo {
    val name: String
}

class AndroidPlatformInfo : PlatformInfo {
    override val name: String = "Android ${Build.VERSION.SDK_INT}"
}
