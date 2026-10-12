import { Moon, Sun } from "lucide-react"

import Button from "@/components/ui/button"
import useTheme from "@/context/theme-provider/useTheme"

function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button className="cursor-pointer" onClick={() => setTheme(theme === "light" ? "dark" : "light")} variant="outline">
      {theme === "light" ? <Moon /> : <Sun />}
    </Button>
  )
}

export default ThemeToggle
