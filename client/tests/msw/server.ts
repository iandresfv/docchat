import { setupServer } from "msw/node"

import { handlers } from "@/mocks/handlers"

/** The same fake API the dev mock mode uses; tests override with `server.use`. */
export const server = setupServer(...handlers)
