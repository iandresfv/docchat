import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { authApi } from "@/api/endpoints/auth"
import { db, DEMO_USER, persist } from "@/mocks/db"
import { problem } from "@/mocks/http"
import { routes } from "@/routes"

import { server } from "../msw/server"
import { renderRoutes } from "../utils"

function pdfFile(name = "notes.pdf", size = 1024) {
  return new File([new Uint8Array(size).fill(48)], name, {
    type: "application/pdf",
  })
}

describe("library", () => {
  beforeEach(async () => {
    await authApi.signin(DEMO_USER)
  })

  it("lists documents with status badges and links ready ones", async () => {
    renderRoutes(routes, "/documents")
    const card = (await screen.findByText("Annual report 2025.pdf")).closest(
      "article"
    )!
    expect(within(card).getByText("ready")).toBeInTheDocument()
    expect(
      within(card).getByRole("link", { name: "Annual report 2025.pdf" })
    ).toHaveAttribute("href", expect.stringMatching(/^\/documents\//))

    const failed = screen
      .getByText("Signed contract (scanned).pdf")
      .closest("article")!
    expect(within(failed).getByText("failed")).toBeInTheDocument()
    expect(within(failed).queryByRole("link")).not.toBeInTheDocument()
  })

  it("shows the empty state when there are no documents", async () => {
    db().pdfs = []
    persist()
    renderRoutes(routes, "/documents")
    expect(await screen.findByText("No documents yet")).toBeInTheDocument()
  })

  it("uploads a PDF and shows it as pending", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/documents")
    await user.click(await screen.findByRole("button", { name: "Upload PDF" }))
    const dialog = await screen.findByRole("dialog")
    await user.upload(within(dialog).getByLabelText("PDF file"), pdfFile())
    expect(within(dialog).getByText("notes.pdf")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Upload" }))
    expect(await within(dialog).findByText(/Processing…/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Done" }))
    const card = (await screen.findByText("notes.pdf")).closest("article")!
    expect(within(card).getByText("pending")).toBeInTheDocument()
  })

  it("maps upload errors to friendly messages", async () => {
    server.use(
      http.post("*/api/v1/pdfs", () =>
        problem(429, "rate-limited", "Too Many Requests", undefined, {
          headers: { "Retry-After": "60" },
        })
      )
    )
    const user = userEvent.setup()
    renderRoutes(routes, "/documents")
    await user.click(await screen.findByRole("button", { name: "Upload PDF" }))
    const dialog = await screen.findByRole("dialog")
    await user.upload(within(dialog).getByLabelText("PDF file"), pdfFile())
    await user.click(within(dialog).getByRole("button", { name: "Upload" }))
    expect(
      await within(dialog).findByText("Upload limit reached, try again later")
    ).toBeInTheDocument()
  })

  it("rejects non-PDF files before uploading", async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderRoutes(routes, "/documents")
    await user.click(await screen.findByRole("button", { name: "Upload PDF" }))
    const dialog = await screen.findByRole("dialog")
    await user.upload(
      within(dialog).getByLabelText("PDF file"),
      new File(["hi"], "notes.txt", { type: "text/plain" })
    )
    expect(
      within(dialog).getByText("Only PDF files are accepted")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Upload" })
    ).toBeDisabled()
  })

  it("deletes a document after confirmation", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/documents")
    await user.click(
      await screen.findByRole("button", {
        name: "Actions for Annual report 2025.pdf",
      })
    )
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Annual report 2025.pdf")
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))
    await waitFor(() => {
      expect(
        screen.queryByText("Annual report 2025.pdf")
      ).not.toBeInTheDocument()
    })
  })

  it("switches to the table view", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, "/documents")
    await screen.findByText("Annual report 2025.pdf")
    await user.click(screen.getByRole("button", { name: "Table view" }))
    expect(await screen.findByRole("table")).toBeInTheDocument()
  })

  it("shows an error with retry when the list fails", async () => {
    server.use(
      http.get("*/api/v1/pdfs", () =>
        HttpResponse.json({ title: "nope" }, { status: 404 })
      )
    )
    renderRoutes(routes, "/documents")
    expect(
      await screen.findByText("Couldn't load your documents.")
    ).toBeInTheDocument()
  })
})
