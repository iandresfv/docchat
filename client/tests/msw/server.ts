import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

/** Baseline handlers; tests add their own with `server.use(...)`. */
export const server = setupServer(
  http.get("*/ready", () => HttpResponse.json({ status: "ready" }))
)
