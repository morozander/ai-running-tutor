import { RouterProvider } from "react-router"

import AuthProvider from "@/context/auth-provider/auth-provider"
import ThemeProvider from "@/context/theme-provider/theme-provider"
import GraphQLProvider from "@/graphql/provider"
import router from "@/router/router"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GraphQLProvider>
          <RouterProvider router={router} />
        </GraphQLProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
