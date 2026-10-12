package com.monorepo.kmp.features.home

import com.monorepo.kmp.features.mvi.MviEffect
import com.monorepo.kmp.features.mvi.MviIntent
import com.monorepo.kmp.features.mvi.MviState

/** Durable UI state only. Every field is defaulted. */
data class HomeState(
    val isLoading: Boolean = true,
    val greeting: String = "",
) : MviState

sealed interface HomeIntent : MviIntent {
    data object Retry : HomeIntent
    data object OpenDetailsClicked : HomeIntent
}

/** One-shot events. Navigation, snackbars and dialogs never live in [HomeState]. */
sealed interface HomeEffect : MviEffect {
    data class OpenDetails(val id: String) : HomeEffect
    data class ShowError(val message: String) : HomeEffect
}
