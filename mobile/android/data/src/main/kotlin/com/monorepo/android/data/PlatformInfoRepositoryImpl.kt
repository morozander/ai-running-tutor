package com.monorepo.android.data

import com.monorepo.android.domain.Resource
import com.monorepo.android.domain.repository.PlatformInfoRepository
import com.monorepo.android.platform.PlatformInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Sample implementation of [PlatformInfoRepository]. A real repository would talk to Ktor/Retrofit,
 * Room, or DataStore. Constructor-injectable; Koin bindings live in :app, never here.
 */
class PlatformInfoRepositoryImpl(
    private val platformInfo: PlatformInfo,
) : PlatformInfoRepository {
    override fun observePlatformName(): Flow<Resource<String>> =
        flow {
            emit(Resource.Loading)
            emit(Resource.Success(platformInfo.name))
        }
}
