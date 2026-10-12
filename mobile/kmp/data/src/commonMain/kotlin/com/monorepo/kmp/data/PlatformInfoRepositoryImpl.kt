package com.monorepo.kmp.data

import com.monorepo.kmp.domain.Resource
import com.monorepo.kmp.domain.repository.PlatformInfoRepository
import com.monorepo.kmp.platform.currentPlatform
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Sample implementation of [PlatformInfoRepository]. A real repository would talk to Ktor, a
 * local data source, or a platform SDK behind :platform. Constructor-injectable; Koin
 * bindings live in :composeApp, never here.
 */
class PlatformInfoRepositoryImpl : PlatformInfoRepository {
    override fun observePlatformName(): Flow<Resource<String>> =
        flow {
            emit(Resource.Loading)
            emit(Resource.Success(currentPlatform().name))
        }
}
