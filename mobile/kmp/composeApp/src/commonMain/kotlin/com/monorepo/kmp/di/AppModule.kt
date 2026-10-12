package com.monorepo.kmp.di

import com.monorepo.kmp.data.PlatformInfoRepositoryImpl
import com.monorepo.kmp.domain.repository.PlatformInfoRepository
import com.monorepo.kmp.domain.usecase.ObserveGreetingUseCase
import com.monorepo.kmp.features.home.HomeViewModel
import org.koin.core.context.startKoin
import org.koin.mp.KoinPlatformTools
import org.koin.core.module.dsl.factoryOf
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.KoinAppDeclaration
import org.koin.dsl.module

/**
 * The single place Koin modules are composed. :domain, :data and
 * :features expose plain classes and interfaces — DI bindings never live there.
 *
 * Binding idioms: repository -> `single<Interface> { Impl(get()) }`, use case -> `factoryOf`,
 * ViewModel -> `viewModelOf`.
 */
val appModule =
    module {
        single<PlatformInfoRepository> { PlatformInfoRepositoryImpl() }
        factoryOf(::ObserveGreetingUseCase)
        viewModelOf(::HomeViewModel)
    }

/** Idempotent so the iOS entry point can call it lazily and Android from Application.onCreate. */
fun initKoin(appDeclaration: KoinAppDeclaration = {}) {
    if (KoinPlatformTools.defaultContext().getOrNull() != null) return
    startKoin {
        appDeclaration()
        modules(appModule, platformModule())
    }
}
