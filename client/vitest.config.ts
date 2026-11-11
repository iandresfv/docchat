import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config.ts"

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: "jsdom",
      globals: false,
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/{unit,integration}/**/*.test.{ts,tsx}"],
      css: false,
      // Leaves room for the longer async-query timeout set on CI in setup.ts.
      testTimeout: process.env.CI ? 20_000 : 5_000,
      restoreMocks: true,
      coverage: {
        provider: "v8",
        include: ["src/**"],
        exclude: [
          "src/components/ui/**",
          "src/api/schema.d.ts",
          "src/mocks/**",
        ],
      },
    },
  })
)
