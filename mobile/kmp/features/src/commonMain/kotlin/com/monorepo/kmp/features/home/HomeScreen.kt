package com.monorepo.kmp.features.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import com.monorepo.kmp.features.resources.Res
import com.monorepo.kmp.features.resources.home_loading
import com.monorepo.kmp.features.resources.home_open_details
import com.monorepo.kmp.features.resources.home_retry
import com.monorepo.kmp.features.resources.home_title
import com.monorepo.kmp.styleguide.theme.AppTheme
import androidx.compose.ui.tooling.preview.Preview
import org.jetbrains.compose.resources.stringResource

/**
 * Stateless screen: `(state, onIntent) -> Unit`. No business logic, no DI, no state ownership —
 * everything comes in through [state] and goes out through [onIntent], which keeps it previewable.
 */
@Composable
fun HomeScreen(
    state: HomeState,
    onIntent: (HomeIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().safeContentPadding(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = stringResource(Res.string.home_title), style = MaterialTheme.typography.titleLarge)
        if (state.isLoading) {
            CircularProgressIndicator()
            Text(text = stringResource(Res.string.home_loading))
        } else {
            Text(
                text = state.greeting,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.testTag("home-greeting"),
            )
        }
        Button(onClick = { onIntent(HomeIntent.Retry) }, modifier = Modifier.testTag("home-retry")) {
            Text(text = stringResource(Res.string.home_retry))
        }
        Button(
            onClick = { onIntent(HomeIntent.OpenDetailsClicked) },
            modifier = Modifier.testTag("home-open-details"),
        ) {
            Text(text = stringResource(Res.string.home_open_details))
        }
    }
}

// Previews are colocated with the screen (multiplatform @Preview), wrapped in the app theme.
@Preview
@Composable
private fun HomeScreenLoadedPreview() {
    AppTheme {
        HomeScreen(state = HomeState(isLoading = false, greeting = "Hello!"), onIntent = {})
    }
}

@Preview
@Composable
private fun HomeScreenLoadingPreview() {
    AppTheme {
        HomeScreen(state = HomeState(isLoading = true), onIntent = {})
    }
}
