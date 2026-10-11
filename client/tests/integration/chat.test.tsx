import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { useViewer } from "@/features/workspace/store"
import {
  db,
  DEMO_USER,
  persist,
  SEED_CONVERSATION_IDS,
  SEED_PDF_IDS,
} from "@/mocks/db"
import { problem } from "@/mocks/http"
import { routes } from "@/routes"
import { usePreferences } from "@/stores/preferences"

import { server } from "../msw/server"
import { renderRoutes } from "../utils"

/** Waits until messages are loaded and the composer accepts input. */
async function readyComposer() {
  await screen.findByRole("log", { name: "Messages" })
  const composer = screen.getByRole("textbox", {
    name: "Ask about this document",
  })
  await waitFor(() => {
    expect(composer).toBeEnabled()
  })
  return composer
}

const revenuePath = `/documents/${SEED_PDF_IDS.report}?c=${SEED_CONVERSATION_IDS.revenue}`

describe("chat", () => {
  beforeEach(async () => {
    // F3 covers the plain endpoint; streaming has its own suite.
    usePreferences.setState({ streamAnswers: false })
    await authApi.signin(DEMO_USER)
  })

  it("renders answers with source chips and inline citations", async () => {
    renderRoutes(routes, revenuePath)
    const log = await screen.findByRole("log", { name: "Messages" })
    const answers = await within(log).findAllByRole("article", {
      name: "DocChat answer",
    })
    expect(answers).toHaveLength(2)
    const first = answers[0]!
    expect(
      within(first).getByRole("list", { name: "Sources" })
    ).toBeInTheDocument()
    expect(
      within(first).getAllByRole("button", { name: "Open page 5" }).length
    ).toBeGreaterThan(1)
    expect(
      within(first).getByText(/1\.6 s · 3\.9k in \/ 118 out/)
    ).toBeInTheDocument()
  })

  it("opens the cited page in the viewer", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const chip = (
      await screen.findAllByRole("button", { name: "Open page 12" })
    )[0]!
    await user.click(chip)
    expect(useViewer.getState().page).toBe(12)
  })

  it("sends a message optimistically and shows the answer", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "What are the main risks?{Enter}")
    const log = screen.getByRole("log", { name: "Messages" })
    expect(
      within(log).getByText("What are the main risks?")
    ).toBeInTheDocument()
    expect(composer).toHaveValue("")
    const answers = await within(log).findAllByRole("article", {
      name: "DocChat answer",
    })
    await waitFor(() => {
      expect(answers.length).toBeGreaterThanOrEqual(2)
    })
    expect(
      await within(log).findByText(/Principal risks are/)
    ).toBeInTheDocument()
  })

  it("keeps the message and offers Retry when sending fails", async () => {
    let calls = 0
    server.use(
      http.post("*/api/v1/conversations/:id/messages", () => {
        calls += 1
        if (calls === 1) {
          return problem(
            503,
            "upstream-unavailable",
            "Upstream Unavailable",
            "The model provider did not respond"
          )
        }
        return undefined
      })
    )
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "What are the main risks?{Enter}")
    expect(await screen.findByText("Upstream Unavailable")).toBeInTheDocument()
    expect(screen.getByText("What are the main risks?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText(/Principal risks are/)).toBeInTheDocument()
    expect(screen.getAllByText("What are the main risks?")).toHaveLength(1)
  })

  it("disables the composer while rate limited", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "hello /ratelimit{Enter}")
    expect(await screen.findByText("Too Many Requests")).toBeInTheDocument()
    expect(screen.getByText(/You can try again in \d+ s/)).toBeInTheDocument()
    expect(composer).toBeDisabled()
  })

  it("creates the conversation on the first message", async () => {
    db().conversations = []
    db().messages = []
    persist()
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, `/documents/${SEED_PDF_IDS.report}`)
    await user.click(
      await screen.findByRole("button", { name: "Summarize this document" })
    )
    const composer = screen.getByRole("textbox", {
      name: "Ask about this document",
    })
    expect(composer).toHaveValue("Summarize this document")
    await user.click(screen.getByRole("button", { name: "Send message" }))
    expect(
      await screen.findByText(/annual report for fiscal 2025/)
    ).toBeInTheDocument()
    expect(db().conversations).toHaveLength(1)
    expect(router.state.location.search).toBe(`?c=${db().conversations[0]!.id}`)
  })

  it("disables the composer while the document is processing", async () => {
    db().pdfs.find((p) => p.id === SEED_PDF_IDS.report)!.frozen_status =
      "processing"
    persist()
    renderRoutes(routes, revenuePath)
    expect(
      await screen.findByText("This document is still processing")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "Ask about this document" })
    ).toBeDisabled()
  })
})
