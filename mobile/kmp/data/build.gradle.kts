import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidMultiplatformLibrary)
}

kotlin {
    android {
        namespace = "com.monorepo.kmp.data"
        compileSdk = libs.versions.android.compileSdk.get().toInt()
        minSdk = libs.versions.android.minSdk.get().toInt()

        compilerOptions {
            jvmTarget = JvmTarget.JVM_11
        }
        withHostTest {}
    }
    iosArm64()
    iosSimulatorArm64()

    // Implements the interfaces :domain declares. Owns repository impls, remote
    // gateways, local data sources, DTOs and mappers. Koin does not belong here — bindings
    // live in :composeApp.
    sourceSets {
        commonMain.dependencies {
            implementation(project(":domain"))
            implementation(project(":platform"))
            implementation(libs.coroutines.core)
            implementation(libs.kotlinx.datetime)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.coroutines.test)
        }
    }
}
