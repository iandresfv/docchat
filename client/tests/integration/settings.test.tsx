import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { DEMO_USER } from "@/mocks/db"
import { routes } from "@/routes"
import { usePreferences } from "@/stores/preferences"

import { server } from "../msw/server"
import { renderRoutes } from "../utils"

describe("settings", () => {
  beforeEach(async () => {
    await authApi.signin(DEMO_USER)
  })

  it("switches the theme", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/settings")
    await user.click(await screen.findByRole("radio", { name: "dark" }))
    expect(usePreferences.getState().theme).toBe("dark")
  })

  it("toggles chat preferences", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/settings")
    await user.click(
      await screen.findByRole("switch", {
        name: "Show token usage under answers",
      })
    )
    expect(usePreferences.getState().showUsage).toBe(false)
  })

  it("shows usage against the daily budget", async () => {
    server.use(
      http.get("*/api/v1/usage/me", () =>
        HttpResponse.json({
          today: { tokens: 120_000, cost_usd: 0.0123, messages: 14 },
          month: { tokens: 900_000, cost_usd: 0.31, messages: 120 },
          limits: { daily_tokens: 300_000 },
        })
      )
    )
    renderRoutes(routes, "/settings")
    expect(
      await screen.findByText("Daily budget 120.0k / 300.0k tokens")
    ).toBeInTheDocument()
    expect(screen.getByText("$0.31")).toBeInTheDocument()
  })

  it("signs out everywhere", async () => {
    let body: unknown = null
    server.use(
      http.post("*/api/v1/auth/signout", async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, "/settings")
    await user.click(
      await screen.findByRole("button", { name: "Sign out everywhere" })
    )
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/signin")
    })
    expect(body).toEqual({ scope: "all" })
  })

  it("opens the shortcuts dialog with ?", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/documents")
    await screen.findByRole("heading", { name: "Library" })
    await user.keyboard("?")
    expect(
      await screen.findByRole("dialog", { name: "Keyboard shortcuts" })
    ).toBeInTheDocument()
  })
})
