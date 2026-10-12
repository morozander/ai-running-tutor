package com.monorepo.kmp.domain.usecase

import com.monorepo.kmp.domain.Resource
import com.monorepo.kmp.domain.model.Greeting
import com.monorepo.kmp.domain.repository.PlatformInfoRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Observes the platform label and applies the app's greeting rule. Carries a business
 * transformation — a use case that merely forwards a repository call would be redundant.
 */
class ObserveGreetingUseCase(
    private val repository: PlatformInfoRepository,
) {
    operator fun invoke(): Flow<Resource<Greeting>> =
        repository.observePlatformName().map { resource ->
            when (resource) {
                is Resource.Success -> Resource.Success(Greeting(message = "Hello from ${resource.data}!"))
                is Resource.Error -> resource
                is Resource.Loading -> Resource.Loading
            }
        }
}
