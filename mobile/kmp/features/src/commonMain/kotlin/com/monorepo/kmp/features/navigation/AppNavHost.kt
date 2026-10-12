package com.monorepo.kmp.features.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.monorepo.kmp.features.details.DetailsScreen
import com.monorepo.kmp.features.home.HomeEffect
import com.monorepo.kmp.features.home.HomeScreen
import com.monorepo.kmp.features.home.HomeViewModel
import org.koin.compose.viewmodel.koinViewModel

/**
 * Root NavHost with type-safe routes. The ViewModel is resolved and its effects collected **here**
 * in the destination block (not inside the stateless screen) — that keeps `*Screen.kt` previewable.
 * Navigation is driven by [HomeEffect], never by a flag in state.
 */
@Composable
fun AppNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = AppRoute.Home) {
        composable<AppRoute.Home> {
            val viewModel: HomeViewModel = koinViewModel()
            val state by viewModel.state.collectAsStateWithLifecycle()
            LaunchedEffectHomeEffects(viewModel, navController)
            HomeScreen(state = state, onIntent = viewModel::onIntent)
        }
        composable<AppRoute.Details> { backStackEntry ->
            val route: AppRoute.Details = backStackEntry.toRoute()
            DetailsScreen(id = route.id, onBack = { navController.popBackStack() })
        }
    }
}

@Composable
private fun LaunchedEffectHomeEffects(
    viewModel: HomeViewModel,
    navController: NavHostController,
) {
    LaunchedEffect(viewModel) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is HomeEffect.OpenDetails -> navController.navigate(AppRoute.Details(effect.id))
                is HomeEffect.ShowError -> Unit // a real app shows a snackbar here
            }
        }
    }
}
