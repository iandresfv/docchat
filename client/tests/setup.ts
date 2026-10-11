import "@testing-library/jest-dom/vitest"

import { cleanup, configure } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterAll, afterEach, beforeAll, vi } from "vitest"

import { installAuthBridge } from "@/features/auth/session"
import { resetDb } from "@/mocks/db"
import { useSession } from "@/stores/session"

import { server } from "./msw/server"

const initialSession = useSession.getState()
installAuthBridge()

// Integration tests render whole routes; give async queries room under
// parallel load (the default is 1 s).
configure({ asyncUtilTimeout: 3_000 })

// jsdom has no layout, so every zero-sized rect "hits" a resize handle and
// react-resizable-panels swallows pointer events. Panels are plain divs here.
vi.mock("react-resizable-panels", async () => {
  const { createElement } = await import("react")
  const passthrough =
    (slot: string) =>
    ({ children, className }: { children?: ReactNode; className?: string }) =>
      createElement("div", { "data-slot": slot, className }, children)
  return {
    Group: passthrough("group"),
    Panel: passthrough("panel"),
    Separator: passthrough("separator"),
  }
})

// jsdom gaps used by the UI (media queries, observers, scrolling).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("min-width") && !query.includes("1280"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})
globalThis.ResizeObserver = class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn()

beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
  localStorage.clear()
  resetDb()
  useSession.setState(initialSession, true)
})
afterAll(() => server.close())
