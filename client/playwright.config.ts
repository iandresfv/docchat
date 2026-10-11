import { defineConfig, devices } from "@playwright/test"

const port = 4173
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Without E2E_BASE_URL the suite runs against a preview build in mock mode
  // (MSW in the browser), so it needs no backend. Point E2E_BASE_URL at the
  // Tilt stack to run the same flows end to end.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build:mock && exec ./node_modules/.bin/vite preview --mode mock --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
