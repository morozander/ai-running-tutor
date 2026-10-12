import { use } from "react"

import { ThemeContext } from "@/context/theme-provider/theme-provider"

const useTheme = () => {
  const context = use(ThemeContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

export default useTheme
