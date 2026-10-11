import { FileText, LayoutGrid, List, RefreshCw, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { Pdf } from "@/api/types"
import { PageHeader } from "@/components/shared/page-header"
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { strings } from "@/lib/strings"
import { useBreadcrumbs } from "@/stores/breadcrumbs"
import { type LibraryView, usePreferences } from "@/stores/preferences"

import { usePdfs } from "../queries"
import { DeletePdfDialog } from "./delete-pdf-dialog"
import { PdfCard } from "./pdf-card"
import { PdfTable } from "./pdf-table"
import { UploadDialog } from "./upload-dialog"

export function LibraryPage() {
  useBreadcrumbs([{ label: strings.nav.library }])
  const { data, isPending, isError, refetch, isRefetching } = usePdfs()
  const view = usePreferences((s) => s.libraryView)
  const setView = usePreferences((s) => s.setLibraryView)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [retryName, setRetryName] = useState<string>()
  const [deleting, setDeleting] = useState<Pdf | null>(null)

  const openUpload = (retry?: Pdf) => {
    setRetryName(retry?.name)
    setUploadOpen(true)
  }

  const pdfs = data?.items ?? []

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={strings.nav.library}
        badge={
          data && (
            <Badge variant="muted" aria-label={`${data.total} documents`}>
              {data.total}
            </Badge>
          )
        }
        actions={
          <>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[view]}
              onValueChange={(value: string[]) => {
                const next = value[0] as LibraryView | undefined
                if (next) setView(next)
              }}
              aria-label="View"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view">
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={() => openUpload()}>
              <Upload data-icon="inline-start" />
              Upload PDF
            </Button>
          </>
        }
      />

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load your documents.</AlertTitle>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              disabled={isRefetching}
              onClick={() => void refetch()}
            >
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : pdfs.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No documents yet</EmptyTitle>
            <EmptyDescription>
              Upload a PDF to start asking questions about it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => openUpload()}>
              <Upload data-icon="inline-start" />
              Upload PDF
            </Button>
          </EmptyContent>
        </Empty>
      ) : view === "table" ? (
        <PdfTable pdfs={pdfs} onDelete={setDeleting} onRetry={openUpload} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {pdfs.map((pdf) => (
            <PdfCard
              key={pdf.id}
              pdf={pdf}
              onDelete={setDeleting}
              onRetry={openUpload}
            />
          ))}
        </div>
      )}

      <ReadyAnnouncer pdfs={pdfs} />
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        retryName={retryName}
      />
      <DeletePdfDialog pdf={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}

/** Announces "<name> is ready" once per PDF that finishes ingesting. */
function ReadyAnnouncer({ pdfs }: { pdfs: Pdf[] }) {
  const region = useRef<HTMLDivElement>(null)
  const previous = useRef(new Map<string, Pdf["status"]>())

  useEffect(() => {
    const ready = pdfs.filter((p) => {
      const before = previous.current.get(p.id)
      return before !== undefined && before !== "ready" && p.status === "ready"
    })
    previous.current = new Map(pdfs.map((p) => [p.id, p.status]))
    if (ready.length > 0 && region.current) {
      region.current.textContent = ready
        .map((p) => `${p.name} is ready`)
        .join(". ")
    }
  }, [pdfs])

  return (
    <div ref={region} role="status" aria-live="polite" className="sr-only" />
  )
}
