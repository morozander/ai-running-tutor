package com.monorepo.kmp.features.details

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import com.monorepo.kmp.styleguide.theme.AppTheme

/**
 * A leaf display screen reached via a type-safe [com.monorepo.kmp.features.navigation.AppRoute.Details]
 * route. It only renders its route argument, so it is stateless and needs no ViewModel — a screen with
 * behaviour would get the Contract/Screen/ViewModel triad instead.
 */
@Composable
fun DetailsScreen(
    id: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().safeContentPadding(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Details for $id",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.testTag("details-title"),
        )
        Button(onClick = onBack, modifier = Modifier.testTag("details-back")) {
            Text(text = "Back")
        }
    }
}

@Preview
@Composable
private fun DetailsScreenPreview() {
    AppTheme {
        DetailsScreen(id = "sample-42", onBack = {})
    }
}
