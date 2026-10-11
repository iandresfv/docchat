import { FileText } from "lucide-react"
import { Link } from "react-router"

import type { Pdf } from "@/api/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBytes, formatRelative } from "@/lib/format"

import { PdfActionsMenu } from "./pdf-actions-menu"
import { StatusBadge } from "./status-badge"

export function PdfTable({
  pdfs,
  onDelete,
  onRetry,
}: {
  pdfs: Pdf[]
  onDelete: (pdf: Pdf) => void
  onRetry: (pdf: Pdf) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right max-sm:hidden">Pages</TableHead>
            <TableHead className="text-right max-sm:hidden">Size</TableHead>
            <TableHead className="max-md:hidden">Created</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pdfs.map((pdf) => (
            <TableRow key={pdf.id}>
              <TableCell className="max-w-0 pl-4">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  {pdf.status === "ready" ? (
                    <Link
                      to={`/documents/${pdf.id}`}
                      className="truncate font-medium hover:underline"
                      title={pdf.name}
                    >
                      {pdf.name}
                    </Link>
                  ) : (
                    <span className="truncate font-medium" title={pdf.name}>
                      {pdf.name}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={pdf.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums max-sm:hidden">
                {pdf.page_count ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums max-sm:hidden">
                {formatBytes(pdf.size_bytes)}
              </TableCell>
              <TableCell className="text-muted-foreground max-md:hidden">
                {formatRelative(pdf.created_at)}
              </TableCell>
              <TableCell>
                <PdfActionsMenu
                  pdf={pdf}
                  onDelete={onDelete}
                  onRetry={onRetry}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
