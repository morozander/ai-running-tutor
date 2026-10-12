import { Navigate } from "react-router"

import useAuth from "@/context/auth-provider/useAuth"

/**
 * Handles the OAuth redirect from Cognito Hosted UI.
 * Amplify automatically exchanges the authorization code for tokens
 * via the Hub "signedIn" event, so this page just waits and redirects.
 */
function Callback() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <section className="flex min-h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Completing sign-in...</p>
      </section>
    )
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
}

export default Callback
