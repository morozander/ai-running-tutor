package com.monorepo.android.features.home

import com.monorepo.android.domain.Resource
import com.monorepo.android.domain.repository.PlatformInfoRepository
import com.monorepo.android.domain.usecase.ObserveGreetingUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test

// Hand-written fake — no mocking framework is on the classpath and none should be added.
private class FakePlatformInfoRepository(
    private val name: String,
) : PlatformInfoRepository {
    override fun observePlatformName(): Flow<Resource<String>> = flowOf(Resource.Success(name))
}

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
    // `viewModelScope` runs on Dispatchers.Main — swap in a test dispatcher for JVM unit tests.
    @Before
    fun setUp() = Dispatchers.setMain(UnconfinedTestDispatcher())

    @After
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
