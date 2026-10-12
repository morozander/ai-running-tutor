package com.monorepo.kmp.domain

/**
 * Wrapper for observed collections and screen-load state. One-shot operations (auth, sync,
 * remote calls) use kotlin's [Result] instead — the two are not interchangeable.
 */
sealed interface Resource<out T> {
    data class Success<T>(val data: T) : Resource<T>

    data class Error(
        val message: String = "",
        val cause: Throwable? = null,
        val type: ErrorType? = null,
    ) : Resource<Nothing>

    data object Loading : Resource<Nothing>
}

/** Coarse error category, mapped to user-facing copy in the presentation layer. */
enum class ErrorType {
    Network,
    NotFound,
    Unauthorized,
    Unknown,
}

/** Convenience for list-bearing flows: the payload on success, empty otherwise. */
fun <T> Resource<List<T>>.dataOrEmpty(): List<T> = (this as? Resource.Success)?.data ?: emptyList()
