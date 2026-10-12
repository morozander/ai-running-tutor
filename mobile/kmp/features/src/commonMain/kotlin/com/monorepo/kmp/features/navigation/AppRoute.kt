package com.monorepo.kmp.features.navigation

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Type-safe navigation destinations for [AppNavHost]. Arguments live on the route and are
 * restored by Navigation Compose across process death. The `@SerialName` string is the stable
 * identity — renaming the Kotlin class must not change it.
 */
@Serializable
sealed interface AppRoute {
    @Serializable
    @SerialName("home")
    data object Home : AppRoute

    @Serializable
    @SerialName("details")
    data class Details(val id: String) : AppRoute
}
