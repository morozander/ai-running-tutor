import { Amplify } from "aws-amplify"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import App from "@/app"
import amplifyConfig from "./aws-exports"

Amplify.configure(amplifyConfig)

const root = document.getElementById("root")

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
