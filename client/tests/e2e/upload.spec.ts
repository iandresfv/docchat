import path from "node:path"

import { expect, test } from "./fixtures"

const samplePdf = path.resolve(
  import.meta.dirname,
  "../../src/mocks/assets/sample.pdf"
)

test("uploads a PDF and watches it become ready", async ({
  authedPage: page,
}) => {
  await page.getByRole("button", { name: "Upload PDF" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("PDF file").setInputFiles(samplePdf)
  await expect(dialog.getByText("sample.pdf")).toBeVisible()
  await dialog.getByRole("button", { name: "Upload", exact: true }).click()
  await expect(dialog.getByText(/Processing…/)).toBeVisible()
  await dialog.getByRole("button", { name: "Done" }).click()

  const card = page.getByRole("article").filter({ hasText: "sample.pdf" })
  await expect(card.getByText(/pending|processing/)).toBeVisible()
  await expect(card.getByText("ready")).toBeVisible({ timeout: 30_000 })
  await card.getByRole("link", { name: "sample.pdf" }).click()
  await expect(page.getByText("Ask anything about")).toBeVisible()
})
