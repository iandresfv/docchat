import { describe, expect, it } from "vitest"

import { API_BASE, env } from "@/lib/env"

describe("env", () => {
  it("defaults to the same-origin API base", () => {
    expect(env.apiUrl).toBe("")
    expect(API_BASE).toBe("/api/v1")
  })
})
