package com.monorepo.kmp.features.home

import com.monorepo.kmp.domain.Resource
import com.monorepo.kmp.domain.repository.PlatformInfoRepository
import com.monorepo.kmp.domain.usecase.ObserveGreetingUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

// Hand-written fake — no mocking framework is on the classpath and none should be added.
private class FakePlatformInfoRepository(
    private val name: String,
) : PlatformInfoRepository {
    override fun observePlatformName(): Flow<Resource<String>> = flowOf(Resource.Success(name))
}

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
    // `viewModelScope` runs on Dispatchers.Main — swap in a test dispatcher for JVM host tests.
    @BeforeTest
    fun setUp() = Dispatchers.setMain(UnconfinedTestDispatcher())

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun success_emits_greeting_and_clears_loading() =
        runTest {
            val useCase = ObserveGreetingUseCase(FakePlatformInfoRepository("TestOS"))
            val viewModel = HomeViewModel(useCase)

            val state = viewModel.state.value
            assertFalse(state.isLoading)
            assertEquals("Hello from TestOS!", state.greeting)
        }
}
