import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
}

test("sign in has no serious accessibility violations", async ({ page }) => {
  await page.goto("/signin")
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})

for (const [name, path, heading] of [
  ["library", "/documents", "Library"],
  ["experiments", "/experiments", "Combinations"],
] as const) {
  test(`${name} has no serious accessibility violations`, async ({
    authedPage: page,
  }) => {
    await page.goto(path)
    await expect(page.getByRole("heading", { name: heading })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
}

test("workspace has no serious accessibility violations", async ({
  authedPage: page,
}) => {
  await page.getByRole("link", { name: "Annual report 2025.pdf" }).click()
  await expect(page.getByRole("log", { name: "Messages" })).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})
