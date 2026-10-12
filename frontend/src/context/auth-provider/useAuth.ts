import { use } from "react"

import { AuthContext } from "@/context/auth-provider/auth-provider"

function useAuth() {
  const context = use(AuthContext)

  if (context === undefined) throw new Error("useAuth must be used within a AuthProvider")

  return context
}

export default useAuth
