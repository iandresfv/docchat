import { FileText } from "lucide-react"
import { Link } from "react-router"

import type { Pdf } from "@/api/types"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PdfActionsMenu } from "./pdf-actions-menu"
import { pdfMetaLine } from "./pdf-meta"
import { StatusBadge } from "./status-badge"

interface Props {
  pdf: Pdf
  onDelete: (pdf: Pdf) => void
  onRetry: (pdf: Pdf) => void
}

/**
 * Library card. Only `ready` PDFs link to the workspace; the stretched link
 * keeps the kebab menu a separate, focusable control.
 */
export function PdfCard({ pdf, onDelete, onRetry }: Props) {
  const ready = pdf.status === "ready"

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors",
        ready && "focus-within:border-ring hover:border-ring/60"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-medium break-words" title={pdf.name}>
            {ready ? (
              <Link
                to={`/documents/${pdf.id}`}
                className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
              >
                {pdf.name}
              </Link>
            ) : (
              pdf.name
            )}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pdfMetaLine(pdf)}
          </p>
        </div>
        <div className="relative z-10 -mt-1 -mr-1">
          <PdfActionsMenu pdf={pdf} onDelete={onDelete} onRetry={onRetry} />
        </div>
      </div>
      {pdf.status === "failed" && pdf.error && (
        <p className="line-clamp-2 text-xs text-destructive" title={pdf.error}>
          {pdf.error}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <StatusBadge status={pdf.status} />
        <span className="text-xs text-muted-foreground">
          created {formatRelative(pdf.created_at)}
        </span>
      </div>
    </article>
  )
}
