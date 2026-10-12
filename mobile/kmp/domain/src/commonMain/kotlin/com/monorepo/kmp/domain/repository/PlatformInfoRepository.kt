package com.monorepo.kmp.domain.repository

import com.monorepo.kmp.domain.Resource
import kotlinx.coroutines.flow.Flow

/**
 * Contract the data layer implements. The interface lives in :domain; the
 * implementation lives in :data and is bound to this type in :composeApp's Koin module.
 */
interface PlatformInfoRepository {
    /** Emits the current platform label. Threading is the caller's concern — no dispatcher here. */
    fun observePlatformName(): Flow<Resource<String>>
}
