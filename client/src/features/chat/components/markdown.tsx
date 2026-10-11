import { memo } from "react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import type { Source } from "@/api/types"

import { linkCitations } from "../citations"
import { SourceChip } from "./source-chip"

function buildComponents(sources: Source[]): Components {
  return {
    a: ({ href, children }) => {
      const match = href?.match(/^#cite-(\d+)$/)
      if (match?.[1]) {
        const page = Number(match[1])
        const source = sources
          .filter((s) => s.page === page)
          .sort((a, b) => b.score - a.score)[0]
        return <SourceChip page={page} source={source} inline />
      }
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      )
    },
    // Answers never get headings larger than h3 (04 §4.3).
    h1: ({ children }) => <h3>{children}</h3>,
    h2: ({ children }) => <h3>{children}</h3>,
  }
}

/** Memoised: finished messages never re-parse while a new one streams. */
export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  sources,
}: {
  content: string
  sources: Source[]
}) {
  return (
    <div className="chat-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={buildComponents(sources)}
      >
        {linkCitations(content)}
      </Markdown>
    </div>
  )
})
