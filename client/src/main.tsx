import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app"
import { installAuthBridge } from "@/features/auth/session"

async function bootstrap() {
  if (import.meta.env.VITE_API_MOCKS === "true") {
    const { startMockApi } = await import("@/mocks/browser")
    await startMockApi()
  }
  installAuthBridge()

  const root = document.getElementById("root")
  if (!root) throw new Error("#root element not found")
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void bootstrap()
