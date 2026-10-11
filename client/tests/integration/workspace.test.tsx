import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { db, DEMO_USER, SEED_CONVERSATION_IDS, SEED_PDF_IDS } from "@/mocks/db"
import { routes } from "@/routes"

import { renderRoutes } from "../utils"

const reportPath = `/documents/${SEED_PDF_IDS.report}`

describe("workspace", () => {
  beforeEach(async () => {
    await authApi.signin(DEMO_USER)
  })

  it("selects the newest conversation when ?c is absent", async () => {
    const { router } = renderRoutes(routes, reportPath)
    const list = await screen.findByRole("list", { name: "Conversations" })
    expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    await waitFor(() => {
      expect(router.state.location.search).toBe(
        `?c=${SEED_CONVERSATION_IDS.risks}`
      )
    })
    expect(
      within(list).getByRole("button", { name: "Conversation 2" })
    ).toHaveAttribute("aria-current", "true")
  })

  it("shows the component arms of each conversation", async () => {
    renderRoutes(routes, reportPath)
    const list = await screen.findByRole("list", { name: "Conversations" })
    expect(within(list).getByText("haiku-5-5")).toBeInTheDocument()
    expect(within(list).getByText("mmr_k4")).toBeInTheDocument()
    expect(
      within(list).getByLabelText("Pinned combination")
    ).toBeInTheDocument()
  })

  it("creates a new conversation and selects it", async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, reportPath)
    await screen.findByRole("list", { name: "Conversations" })
    await user.click(screen.getByRole("button", { name: "New conversation" }))
    const created = await screen.findByRole("button", {
      name: "Conversation 3",
    })
    await waitFor(() => {
      expect(created).toHaveAttribute("aria-current", "true")
    })
    const id = db().conversations.find((c) => c.title === "Conversation 3")?.id
    expect(router.state.location.search).toBe(`?c=${id}`)
  })

  it("renames a conversation inline", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, `${reportPath}?c=${SEED_CONVERSATION_IDS.revenue}`)
    await user.click(
      await screen.findByRole("button", { name: "Actions for Revenue growth" })
    )
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }))
    const input = screen.getByRole("textbox", { name: "Conversation title" })
    await user.clear(input)
    await user.type(input, "2025 revenue{Enter}")
    const list = screen.getByRole("list", { name: "Conversations" })
    expect(
      await within(list).findByRole("button", { name: "2025 revenue" })
    ).toBeInTheDocument()
  })

  it("deletes a conversation after confirmation", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, reportPath)
    await user.click(
      await screen.findByRole("button", { name: "Actions for Revenue growth" })
    )
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Revenue growth" })
      ).not.toBeInTheDocument()
    })
  })

  it("shows not found for an unknown document", async () => {
    renderRoutes(routes, "/documents/does-not-exist")
    expect(await screen.findByText("Document not found")).toBeInTheDocument()
  })
})
