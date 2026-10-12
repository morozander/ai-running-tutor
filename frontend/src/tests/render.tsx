import { type RenderOptions, render as rtlRender } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"

function AllTheProviders({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: AllTheProviders, ...options })
}

export default render
