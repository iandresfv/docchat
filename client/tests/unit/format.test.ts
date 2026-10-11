import { describe, expect, it } from "vitest"

import {
  formatBytes,
  formatCost,
  formatDuration,
  formatRelativeShort,
  formatTokens,
  pluralize,
} from "@/lib/format"

describe("format", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1_258_291)).toBe("1.2 MB")
  })

  it("formats tokens, cost and duration like the answer meta line", () => {
    expect(formatTokens(3_900)).toBe("3.9k")
    expect(formatTokens(412)).toBe("412")
    expect(formatCost(0.0006)).toBe("$0.0006")
    expect(formatCost(1.234)).toBe("$1.23")
    expect(formatDuration(1_800)).toBe("1.8 s")
  })

  it("formats short relative times", () => {
    const now = Date.parse("2026-10-11T12:00:00Z")
    expect(formatRelativeShort("2026-10-11T10:00:00Z", now)).toBe("2 h ago")
    expect(formatRelativeShort("2026-10-11T11:59:30Z", now)).toBe("just now")
  })

  it("pluralizes", () => {
    expect(pluralize(1, "page")).toBe("1 page")
    expect(pluralize(3, "conversation")).toBe("3 conversations")
  })
})
