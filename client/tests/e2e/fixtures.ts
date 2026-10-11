import { expect, type Page, test as base } from "@playwright/test"

export const user = {
  email: process.env.E2E_EMAIL ?? "demo@docchat.dev",
  password: process.env.E2E_PASSWORD ?? "docchat-demo",
}

export async function signIn(page: Page) {
  await page.goto("/signin")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
}

/** A page that is already signed in. */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await signIn(page)
    await use(page)
  },
})

export { expect }
