import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { experimentsApi } from "@/api/endpoints/experiments"
import { db, DEMO_USER } from "@/mocks/db"
import { routes } from "@/routes"

import { server } from "../msw/server"
import { renderRoutes } from "../utils"

describe("experiments dashboard", () => {
  beforeEach(async () => {
    await authApi.signin(DEMO_USER)
  })

  it("shows marginals that match the summary endpoint", async () => {
    const summary = await experimentsApi.summary(false)
    renderRoutes(routes, "/experiments")
    for (const arm of summary.marginals.llm) {
      const mean =
        arm.mean === null
          ? "—"
          : `${arm.mean > 0 ? "+" : ""}${arm.mean.toFixed(2)}`
      expect(
        await screen.findByRole("img", {
          name: `${arm.arm}, mean ${mean} from ${arm.scores} ratings`,
        })
      ).toBeInTheDocument()
    }
  })

  it("sorts combinations by mean, descending by default, and toggles", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/experiments")
    const table = await screen.findByRole("table")
    const means = () =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => Number(within(row).getAllByRole("cell")[7]!.textContent))
    const initial = means()
    expect(initial).toEqual([...initial].sort((a, b) => b - a))
    await user.click(within(table).getByRole("button", { name: /Mean/ }))
    const toggled = means()
    expect(toggled).toEqual([...toggled].sort((a, b) => a - b))
  })

  it("includes pinned conversations on demand", async () => {
    const user = userEvent.setup()
    let lastQuery = ""
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/experiments/summary"))
        lastQuery = new URL(request.url).search
    })
    renderRoutes(routes, "/experiments")
    await screen.findByRole("table")
    await user.click(
      screen.getByRole("switch", { name: "Include pinned conversations" })
    )
    await waitFor(() => {
      expect(lastQuery).toBe("?include_pinned=true")
    })
    server.events.removeAllListeners()
  })

  it("starts a pinned conversation from a combination", async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, "/experiments")
    await screen.findByRole("table")
    await user.click(
      screen.getByRole("button", {
        name: "Start pinned conversation with haiku-4-5, mmr_k4, window_6",
      })
    )
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Start" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/documents\//)
    })
    const created = db().conversations.at(-1)!
    expect(created).toMatchObject({
      pinned: true,
      components: { llm: "haiku-4-5", retriever: "mmr_k4", memory: "window_6" },
    })
  })

  it("shows the empty state when nothing has been rated", async () => {
    server.use(
      http.get("*/api/v1/experiments/summary", () =>
        HttpResponse.json({
          combinations: [],
          marginals: { llm: [], retriever: [], memory: [] },
          generated_at: new Date().toISOString(),
        })
      )
    )
    renderRoutes(routes, "/experiments")
    expect(await screen.findByText("No ratings yet")).toBeInTheDocument()
  })
})
