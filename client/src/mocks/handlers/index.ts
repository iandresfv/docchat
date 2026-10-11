import { http, HttpResponse } from "msw"

import { authHandlers } from "./auth"
import { conversationHandlers } from "./conversations"
import { experimentHandlers } from "./experiments"
import { messageHandlers } from "./messages"
import { pdfHandlers } from "./pdfs"
import { scoreHandlers } from "./scores"
import { usageHandlers } from "./usage"

const healthHandlers = [
  http.get("*/ready", () =>
    HttpResponse.json({
      status: "ready",
      checks: {
        postgres: "ok",
        redis: "ok",
        storage: "ok",
        vector_index: "ok",
      },
      version: "mock",
    })
  ),
]

export const handlers = [
  ...healthHandlers,
  ...authHandlers,
  ...pdfHandlers,
  ...conversationHandlers,
  ...messageHandlers,
  ...scoreHandlers,
  ...experimentHandlers,
  ...usageHandlers,
]
