import { expect, test } from "./fixtures"

test("asks a question, streams a cited answer and rates it", async ({
  authedPage: page,
}) => {
  await page.getByRole("link", { name: "Annual report 2025.pdf" }).click()
  await page.getByRole("button", { name: "New conversation" }).click()
  await expect(page.getByText("Ask anything about")).toBeVisible()

  await page.getByRole("button", { name: "What are the key findings?" }).click()
  await page.keyboard.press("Enter")

  const answer = page.getByRole("article", { name: "DocChat answer" }).last()
  await expect(answer.getByText(/Net revenue retention/)).toBeVisible({
    timeout: 20_000,
  })
  await expect(
    page.getByRole("status").filter({ hasText: "Answer complete" })
  ).toBeAttached()

  await answer
    .getByRole("list", { name: "Sources" })
    .getByRole("button")
    .first()
    .click()
  await expect(page.getByLabel("Page", { exact: true })).toHaveValue("4")

  await answer.getByRole("button", { name: "Good answer" }).click()
  await expect(
    answer.getByRole("button", { name: "Good answer" })
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Skip" }).click()
})

test("stops a streaming answer and keeps the partial", async ({
  authedPage: page,
}) => {
  await page.getByRole("link", { name: "Annual report 2025.pdf" }).click()
  await page.getByRole("button", { name: "New conversation" }).click()
  await expect(page.getByText("Ask anything about")).toBeVisible()
  await page
    .getByLabel("Ask about this document")
    .fill("Summarize this document")
  await page.keyboard.press("Enter")
  const draft = page.getByRole("article", {
    name: "DocChat answer (generating)",
  })
  await expect(draft.getByText(/Northwind/)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByText("Stopped")).toBeVisible()
  await page.reload()
  await expect(page.getByText("Stopped")).toBeVisible()
})
