package com.monorepo.kmp.styleguide.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * App theme wrapper. The scaffold is light-only by design — add a dark scheme only behind a
 * ticket with a design, never as an ad-hoc `isSystemInDarkTheme()` branch. Design tokens that
 * Material 3 has no slot for belong in a token object next to this file.
 *
 * Content is wrapped in a [Surface] using the theme background so screens and `@Preview`s paint
 * on a real surface instead of a transparent canvas.
 */
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(),
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
            content = content,
        )
    }
}
