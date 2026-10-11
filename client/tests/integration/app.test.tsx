import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { routes } from "@/routes"

import { renderRoutes } from "../utils"

describe("app shell", () => {
  it("redirects / to the library inside the app layout", async () => {
    const { router: memory } = renderRoutes(routes, "/")
    expect(
      await screen.findByRole("heading", { name: "Library" })
    ).toBeInTheDocument()
    expect(memory.state.location.pathname).toBe("/documents")
    expect(
      screen.getAllByRole("link", { name: "Experiments" }).length
    ).toBeGreaterThan(0)
  })

  it("renders the not-found page for unknown routes", async () => {
    renderRoutes(routes, "/nope")
    expect(
      await screen.findByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument()
  })
})
