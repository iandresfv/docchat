import { describe, expect, it } from "vitest"

import type { Message } from "@/api/types"
import { linkCitations } from "@/features/chat/citations"
import { conversationToMarkdown, slugify } from "@/features/chat/export"

describe("linkCitations", () => {
  it("turns [p.N] markers into cite links", () => {
    expect(linkCitations("Growth was 18% [p.5] and [p. 12].")).toBe(
      "Growth was 18% [p.5](#cite-5) and [p.12](#cite-12)."
    )
  })
})

describe("conversationToMarkdown", () => {
  it("exports turns with page references", () => {
    const base = { conversation_id: "c", created_at: "2026-10-11T00:00:00Z" }
    const messages: Message[] = [
      { ...base, id: "1", seq: 1, role: "human", content: "Revenue?" },
      {
        ...base,
        id: "2",
        seq: 2,
        role: "assistant",
        content: "Up 18% [p.5].",
        sources: [
          { chunk_id: "a", page: 5, score: 0.9, snippet: "" },
          { chunk_id: "b", page: 4, score: 0.8, snippet: "" },
        ],
      },
    ]
    expect(conversationToMarkdown("Revenue growth", messages)).toBe(
      "# Revenue growth\n\n**You:** Revenue?\n\n**DocChat:** Up 18% [p.5].\n\n_Sources: p.4, p.5_\n"
    )
  })

  it("slugifies titles for filenames", () => {
    expect(slugify("Revenue growth (2025)!")).toBe("revenue-growth-2025")
  })
})
