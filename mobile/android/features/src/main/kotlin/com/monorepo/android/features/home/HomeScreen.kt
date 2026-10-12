package com.monorepo.android.features.home

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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.monorepo.android.features.R
import com.monorepo.android.styleguide.theme.AppTheme

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
        Text(text = stringResource(R.string.home_title), style = MaterialTheme.typography.titleLarge)
        if (state.isLoading) {
            CircularProgressIndicator()
            Text(text = stringResource(R.string.home_loading))
        } else {
            Text(
                text = state.greeting,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.testTag("home-greeting"),
            )
        }
        Button(onClick = { onIntent(HomeIntent.Retry) }, modifier = Modifier.testTag("home-retry")) {
            Text(text = stringResource(R.string.home_retry))
        }
        Button(
            onClick = { onIntent(HomeIntent.OpenDetailsClicked) },
            modifier = Modifier.testTag("home-open-details"),
        ) {
            Text(text = stringResource(R.string.home_open_details))
        }
    }
}

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
