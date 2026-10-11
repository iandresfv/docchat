import { setupWorker } from "msw/browser"

import samplePdfUrl from "./assets/sample.pdf?url"
import { handlers } from "./handlers"
import { setSamplePdfUrl } from "./handlers/pdfs"

export async function startMockApi() {
  setSamplePdfUrl(samplePdfUrl)
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledFrame: "bypass", quiet: true })
  console.info(
    "%c[DocChat] Mock API enabled — sign in with demo@docchat.dev / docchat-demo",
    "color:#5B4FD6"
  )
}
