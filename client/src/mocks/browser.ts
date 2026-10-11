import { setupWorker } from "msw/browser"

import { handlers } from "./handlers"

export async function startMockApi() {
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledFrame: "bypass", quiet: true })
  console.info(
    "%c[DocChat] Mock API enabled — sign in with demo@docchat.dev / docchat-demo",
    "color:#5B4FD6"
  )
}
