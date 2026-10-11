import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { delay, http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { db, DEMO_USER, SEED_CONVERSATION_IDS, SEED_PDF_IDS } from "@/mocks/db"
import { routes } from "@/routes"
import { usePreferences } from "@/stores/preferences"

import { server } from "../msw/server"
import { renderRoutes } from "../utils"

const revenuePath = `/documents/${SEED_PDF_IDS.report}?c=${SEED_CONVERSATION_IDS.revenue}`

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

const sse = (events: [string, unknown][]) =>
  events
    .map(
      ([e, d], i) => `id: ${i + 1}\nevent: ${e}\ndata: ${JSON.stringify(d)}\n\n`
    )
    .join("")

describe("streaming", () => {
  beforeEach(async () => {
    usePreferences.setState({ streamAnswers: true })
    await authApi.signin(DEMO_USER)
  })

  it("streams an answer and announces start and completion", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "What are the main risks?{Enter}")
    expect(await screen.findByText(/Principal risks are/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("Answer complete")).toBeInTheDocument()
    })
    const log = screen.getByRole("log", { name: "Messages" })
    expect(
      within(log).getAllByRole("article", { name: "DocChat answer" })
    ).toHaveLength(3)
  })

  it("renders sources before any text arrives", async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post("*/api/v1/conversations/:id/messages/stream", () => {
        const encoder = new TextEncoder()
        const body = new ReadableStream({
          async start(controller) {
            controller.enqueue(
              encoder.encode(
                sse([
                  [
                    "message_start",
                    {
                      user_message_id: "u1",
                      assistant_message_id: "a1",
                      seq: 5,
                    },
                  ],
                  [
                    "sources",
                    [{ chunk_id: "x", page: 9, score: 0.8, snippet: "People" }],
                  ],
                ])
              )
            )
            await gate
            controller.close()
          },
        })
        return new HttpResponse(body, {
          headers: { "Content-Type": "text/event-stream" },
        })
      })
    )
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "Headcount?{Enter}")
    const draft = await screen.findByRole("article", {
      name: "DocChat answer (generating)",
    })
    expect(
      await within(draft).findByRole("button", { name: "Open page 9" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Stop generating" })
    ).toBeInTheDocument()
    release()
  })

  it("stops on demand and keeps the partial answer", async () => {
    server.use(
      http.post("*/api/v1/conversations/:id/messages/stream", () => {
        // Server state after a disconnect: human turn + partial answer.
        // (MSW's Node interceptor doesn't surface client aborts, so it is
        // stored up front.)
        const base = {
          conversation_id: SEED_CONVERSATION_IDS.revenue,
          created_at: new Date().toISOString(),
        }
        db().messages.push(
          { ...base, id: "u1", seq: 5, role: "human", content: "Tell me more" },
          {
            ...base,
            id: "a1",
            seq: 6,
            role: "assistant",
            content: "Partial answer ",
            finish_reason: "client_disconnect",
          }
        )
        const encoder = new TextEncoder()
        const body = new ReadableStream({
          async start(controller) {
            controller.enqueue(
              encoder.encode(
                sse([
                  [
                    "message_start",
                    {
                      user_message_id: "u1",
                      assistant_message_id: "a1",
                      seq: 5,
                    },
                  ],
                  ["sources", []],
                  ["delta", { text: "Partial answer " }],
                ])
              )
            )
            await delay(5_000)
            controller.close()
          },
        })
        return new HttpResponse(body, {
          headers: { "Content-Type": "text/event-stream" },
        })
      })
    )
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "Tell me more{Enter}")
    expect(await screen.findByText(/Partial answer/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Stop generating" }))
    expect(await screen.findByText("Stopped")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Send message" })
    ).toBeInTheDocument()
  })

  it("shows an inline error when the stream fails midway", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    const composer = await readyComposer()
    await user.type(composer, "Revenue please /midstream{Enter}")
    expect(await screen.findByText("Upstream Unavailable")).toBeInTheDocument()
    expect(await screen.findByText("Interrupted")).toBeInTheDocument()
  })

  it("falls back to the plain endpoint when streaming is off", async () => {
    usePreferences.setState({ streamAnswers: false })
    const user = userEvent.setup()
    renderRoutes(routes, revenuePath)
    expect(
      await screen.findByRole("switch", { name: "Stream answers" })
    ).not.toBeChecked()
    const composer = await readyComposer()
    await user.type(composer, "What are the main risks?{Enter}")
    expect(await screen.findByText(/Principal risks are/)).toBeInTheDocument()
  })
})
