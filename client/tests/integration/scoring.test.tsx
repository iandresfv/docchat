import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { db, DEMO_USER, SEED_CONVERSATION_IDS, SEED_PDF_IDS } from "@/mocks/db"
import { problem } from "@/mocks/http"
import { routes } from "@/routes"

import { server } from "../msw/server"
import { renderRoutes } from "../utils"

const revenuePath = `/documents/${SEED_PDF_IDS.report}?c=${SEED_CONVERSATION_IDS.revenue}`
// Second answer in the seeded conversation has no score yet.
const UNSCORED = "a1000000-0000-4000-8000-000000000004"

async function answers() {
  const log = await screen.findByRole("log", { name: "Messages" })
  return within(log).findAllByRole("article", { name: "DocChat answer" })
}

describe("message scoring", () => {
  beforeEach(async () => {
    await authApi.signin(DEMO_USER)
  })

  it("shows existing votes as pressed toggles", async () => {
    renderRoutes(routes, revenuePath)
    const [first, second] = await answers()
    expect(
      within(first!).getByRole("button", { name: "Good answer" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      within(second!).getByRole("button", { name: "Good answer" })
    ).toHaveAttribute("aria-pressed", "false")
  })

  it("votes, comments and clears a vote", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const second = (await answers())[1]!
    await user.click(within(second).getByRole("button", { name: "Bad answer" }))
    expect(
      within(second).getByRole("button", { name: "Bad answer" })
    ).toHaveAttribute("aria-pressed", "true")
    const comment = await screen.findByLabelText(/What went wrong\?/)
    await user.type(comment, "Missed the margin guidance")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(db().messages.find((m) => m.id === UNSCORED)?.score).toEqual({
        value: -1,
        comment: "Missed the margin guidance",
      })
    })

    await user.click(within(second).getByRole("button", { name: "Bad answer" }))
    await waitFor(() => {
      expect(db().messages.find((m) => m.id === UNSCORED)?.score).toBeNull()
    })
  })

  it("rolls back the vote when the request fails", async () => {
    server.use(
      http.put("*/api/v1/messages/:id/score", () =>
        problem(503, "upstream-unavailable", "Upstream Unavailable")
      )
    )
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const second = (await answers())[1]!
    const up = within(second).getByRole("button", { name: "Good answer" })
    await user.click(up)
    await waitFor(() => {
      expect(up).toHaveAttribute("aria-pressed", "false")
    })
  })
})
