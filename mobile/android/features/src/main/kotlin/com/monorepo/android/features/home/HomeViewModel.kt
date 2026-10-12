package com.monorepo.android.features.home

import androidx.lifecycle.viewModelScope
import com.monorepo.android.domain.Resource
import com.monorepo.android.domain.usecase.ObserveGreetingUseCase
import com.monorepo.android.features.mvi.MviViewModel
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/**
 * Sample MVI ViewModel. Talks to a use case — never to a repository or data source directly.
 * State is durable UI; failures and navigation surface as a [HomeEffect].
 */
class HomeViewModel(
    private val observeGreeting: ObserveGreetingUseCase,
) : MviViewModel<HomeIntent, HomeState, HomeEffect>(HomeState()) {
    init {
        observe()
    }

    override fun onIntent(intent: HomeIntent) {
        when (intent) {
            HomeIntent.Retry -> observe()
            HomeIntent.OpenDetailsClicked -> sendEffect(HomeEffect.OpenDetails(id = "android-42"))
        }
    }

    private fun observe() {
        updateState { copy(isLoading = true) }
        observeGreeting()
            .onEach { resource ->
                when (resource) {
                    is Resource.Loading -> updateState { copy(isLoading = true) }
                    is Resource.Success ->
                        updateState { copy(isLoading = false, greeting = resource.data.message) }
                    is Resource.Error -> {
                        updateState { copy(isLoading = false) }
                        sendEffect(HomeEffect.ShowError(resource.message))
                    }
                }
            }.launchIn(viewModelScope)
    }
}
