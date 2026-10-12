// Top-level build file. Plugins are applied per-module; declared here (apply false) so every
// subproject resolves the same versions from the version catalog.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ktlint) apply false
}

subprojects {
    apply(plugin = "org.jlleitschuh.gradle.ktlint")

    tasks.matching { it.name.contains("KotlinScripts") }.configureEach { enabled = false }

    configure<org.jlleitschuh.gradle.ktlint.KtlintExtension> {
        filter {
            exclude { it.file.invariantSeparatorsPath.contains("/build/") }
            exclude("**/generated/**")
            exclude("**/build/**")
        }
    }
}
