import type { CSSProperties } from "react"
import { Toaster, type ToasterProps } from "sonner"
import useTheme from "@/context/theme-provider/useTheme"

function Sonner({ ...props }: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      richColors={true}
      {...props}
    />
  )
}

export default Sonner
