package com.monorepo.android.di

import com.monorepo.android.data.PlatformInfoRepositoryImpl
import com.monorepo.android.domain.repository.PlatformInfoRepository
import com.monorepo.android.domain.usecase.ObserveGreetingUseCase
import com.monorepo.android.features.home.HomeViewModel
import com.monorepo.android.platform.AndroidPlatformInfo
import com.monorepo.android.platform.PlatformInfo
import org.koin.core.module.dsl.factoryOf
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

/**
 * The single place Koin modules are composed. :domain, :data, :platform and :features expose plain
 * classes and interfaces — DI bindings never live there.
 *
 * Binding idioms: interface/impl -> `single<Interface> { Impl(get()) }`, use case -> `factoryOf`,
 * ViewModel -> `viewModelOf`.
 */
val appModule =
    module {
        single<PlatformInfo> { AndroidPlatformInfo() }
        single<PlatformInfoRepository> { PlatformInfoRepositoryImpl(get()) }
        factoryOf(::ObserveGreetingUseCase)
        viewModelOf(::HomeViewModel)
    }
