package com.monorepo.android.domain.repository

import com.monorepo.android.domain.Resource
import kotlinx.coroutines.flow.Flow

/**
 * Contract the data layer implements. The interface lives in :domain; the implementation lives in
 * :data and is bound to this type in :app's Koin module.
 */
interface PlatformInfoRepository {
    fun observePlatformName(): Flow<Resource<String>>
}
