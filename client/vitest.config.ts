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
