plugins {
    alias(libs.plugins.android.library)
}

// OS capabilities / device APIs (permissions, sensors, platform SDKs) behind small facades.
// Android-only, so no expect/actual — just Android implementations of interfaces the app binds.
android {
    namespace = "com.monorepo.android.platform"
    compileSdk {
        version = release(37)
    }
    defaultConfig {
        minSdk = 30
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(project(":domain"))
}
