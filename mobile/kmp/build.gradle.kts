plugins {
    // Applied per-module; declared here (apply false) so every subproject's classloader
    // resolves the same plugin versions from the version catalog.
    alias(libs.plugins.androidApplication) apply false
    alias(libs.plugins.androidMultiplatformLibrary) apply false
    alias(libs.plugins.composeMultiplatform) apply false
    alias(libs.plugins.composeCompiler) apply false
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.ktlint) apply false
}

subprojects {
    apply(plugin = "org.jlleitschuh.gradle.ktlint")

    // ktlint's parser rejects Kotlin 2.x .gradle.kts files. Build scripts are not the target
    // of the style gate, so lint Kotlin sources only.
    tasks.matching { it.name.contains("KotlinScripts") }.configureEach { enabled = false }

    configure<org.jlleitschuh.gradle.ktlint.KtlintExtension> {
        filter {
            exclude { it.file.invariantSeparatorsPath.contains("/build/") }
            exclude("**/generated/**")
            exclude("**/build/**")
        }
    }
}
