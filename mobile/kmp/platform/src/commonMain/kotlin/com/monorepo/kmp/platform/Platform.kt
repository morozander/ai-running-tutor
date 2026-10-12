package com.monorepo.kmp.platform

/**
 * Cross-platform SDK/framework integrations live behind common Kotlin interfaces in this
 * module. [Platform] is the scaffold's example: a capability whose `actual` differs per target.
 */
interface Platform {
    val name: String
}

expect fun currentPlatform(): Platform
