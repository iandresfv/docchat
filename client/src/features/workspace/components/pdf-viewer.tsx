import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  PanelRightClose,
  RefreshCw,
} from "lucide-react"
import { useState } from "react"

import type { PdfDetail } from "@/api/types"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import { useViewer } from "../store"

interface Props {
  pdf: PdfDetail | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  /** Renders the collapse button (desktop three-pane layout only). */
  onCollapse?: () => void
}

/**
 * Native PDF viewer in an iframe (ADR-16). The frame is re-keyed on page
 * changes because browsers don't reliably react to `#page=` fragment updates.
 */
export function PdfViewer({ pdf, loading, error, onRetry, onCollapse }: Props) {
  const page = useViewer((s) => s.page)
  const citeToken = useViewer((s) => s.citeToken)
  const setPage = useViewer((s) => s.setPage)
  const total = pdf?.page_count ?? null
  const clamp = (n: number) => Math.min(Math.max(1, n), total ?? n)

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
        <ButtonGroup aria-label="Page navigation">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!pdf || page <= 1}
            onClick={() => setPage(clamp(page - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!pdf || (total !== null && page >= total)}
            onClick={() => setPage(clamp(page + 1))}
          >
            <ChevronRight />
          </Button>
        </ButtonGroup>
        <PageInput
          key={page}
          page={page}
          total={total}
          disabled={!pdf}
          onCommit={(n) => setPage(clamp(n))}
        />
        <div className="ml-auto flex items-center gap-1">
          {pdf && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open in new tab"
              render={
                <a
                  href={`${pdf.download_url}#page=${page}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              nativeButton={false}
            >
              <ExternalLink />
            </Button>
          )}
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Hide document"
              onClick={onCollapse}
            >
              <PanelRightClose />
            </Button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {error ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileWarning />
              </EmptyMedia>
              <EmptyTitle>Couldn't load the document</EmptyTitle>
              <EmptyDescription>
                The download link may have expired.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw data-icon="inline-start" />
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : loading || !pdf ? (
          <Skeleton className="absolute inset-3 rounded-lg" />
        ) : (
          <Frame
            key={`${pdf.download_url}|${page}|${citeToken}`}
            src={`${pdf.download_url}#page=${page}`}
            title={`PDF: ${pdf.name}`}
          />
        )}
      </div>
    </div>
  )
}

function Frame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <Skeleton className="absolute inset-3 rounded-lg" />}
      <iframe
        title={title}
        src={src}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 size-full border-0"
      />
    </>
  )
}

function PageInput({
  page,
  total,
  disabled,
  onCommit,
}: {
  page: number
  total: number | null
  disabled: boolean
  onCommit: (page: number) => void
}) {
  const [draft, setDraft] = useState(String(page))
  const commit = () => {
    const n = Number.parseInt(draft, 10)
    if (Number.isFinite(n)) onCommit(n)
    else setDraft(String(page))
  }
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Input
        value={draft}
        disabled={disabled}
        inputMode="numeric"
        aria-label="Page"
        className="h-7 w-12 text-center tabular-nums"
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
        }}
      />
      {total !== null && <span className="tabular-nums">/ {total}</span>}
    </div>
  )
}
