import type { Source } from "@/api/types"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useViewer } from "@/features/workspace/store"
import { cn } from "@/lib/utils"

/**
 * `p. 7` chip. Hover shows the retrieved snippet and similarity; click opens
 * the page in the viewer and rings the chip for 1 s (04 §4.3).
 */
export function SourceChip({
  page,
  source,
  inline,
}: {
  page: number
  source?: Source
  inline?: boolean
}) {
  const cite = useViewer((s) => s.cite)
  const citedPage = useViewer((s) => s.citedPage)
  const citeToken = useViewer((s) => s.citeToken)
  const ringing = citedPage === page && citeToken > 0

  const chip = (
    <button
      key={ringing ? citeToken : "idle"}
      type="button"
      data-cite
      onClick={() => cite(page)}
      aria-label={`Open page ${page}`}
      className={cn(
        "inline-flex h-6 items-center rounded-[0.375rem] bg-accent px-2 align-baseline font-mono text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70",
        inline && "mx-0.5 h-5 px-1.5 text-[11px]",
        ringing && "animate-cite-ring"
      )}
    >
      p.&nbsp;{page}
    </button>
  )

  if (!source) return chip

  return (
    <HoverCard>
      <HoverCardTrigger delay={250} render={chip} />
      <HoverCardContent className="w-72 space-y-2 text-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page}</span>
          <span className="font-mono">
            similarity {source.score.toFixed(2)}
          </span>
        </div>
        <p className="leading-relaxed">
          {source.snippet.length > 240
            ? `${source.snippet.slice(0, 240)}…`
            : source.snippet}
        </p>
      </HoverCardContent>
    </HoverCard>
  )
}

/** One chip per cited page, best score first. */
export function SourcesStrip({ sources }: { sources: Source[] }) {
  const byPage = new Map<number, Source>()
  for (const s of sources) {
    const prev = byPage.get(s.page)
    if (!prev || s.score > prev.score) byPage.set(s.page, s)
  }
  const ordered = [...byPage.values()].sort((a, b) => b.score - a.score)
  if (ordered.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Sources">
      {ordered.map((s) => (
        <li key={s.page}>
          <SourceChip page={s.page} source={s} />
        </li>
      ))}
    </ul>
  )
}
