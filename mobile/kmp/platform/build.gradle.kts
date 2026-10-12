import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidMultiplatformLibrary)
}

kotlin {
    android {
        namespace = "com.monorepo.kmp.platform"
        compileSdk = libs.versions.android.compileSdk.get().toInt()
        minSdk = libs.versions.android.minSdk.get().toInt()

        compilerOptions {
            jvmTarget = JvmTarget.JVM_11
        }
    }
    iosArm64()
    iosSimulatorArm64()

    // Home for cross-platform SDK/framework integrations behind a common Kotlin interface.
    // Depends only on :domain — no UI, no Koin.
    sourceSets {
        commonMain.dependencies {
            implementation(project(":domain"))
        }
    }
}
