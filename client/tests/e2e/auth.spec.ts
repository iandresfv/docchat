import { expect, signIn, test, user } from "./fixtures"

test("redirects to sign in and back to the requested page", async ({
  page,
}) => {
  await page.goto("/experiments")
  await expect(page).toHaveURL(/\/signin\?returnTo=%2Fexperiments/)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Experiments" })).toBeVisible()
})

test("rejects bad credentials with a generic message", async ({ page }) => {
  await page.goto("/signin")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByText("Invalid email or password.")).toBeVisible()
})

test("keeps the session across reloads and signs out", async ({ page }) => {
  await signIn(page)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
  await page.getByRole("button", { name: "Account menu" }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/signin/)
  await page.goto("/documents")
  await expect(page).toHaveURL(/\/signin/)
})
