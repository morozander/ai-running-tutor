plugins {
    alias(libs.plugins.android.library)
}

// Repository implementations, remote/local data sources, DTOs, mappers. Implements :domain
// contracts; no Koin here (bindings live in :app).
android {
    namespace = "com.monorepo.android.data"
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
    implementation(project(":platform"))
    implementation(libs.kotlinx.coroutines.core)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
