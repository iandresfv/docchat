import { setupServer } from "msw/node"

/** Per-test handlers are added with `server.use(...)`. */
export const server = setupServer()
