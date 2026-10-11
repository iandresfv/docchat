import type { PdfStatus } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

const variants = {
  pending: "muted",
  processing: "warning",
  ready: "success",
  failed: "destructive",
} as const

/** Ingestion status; always text, never colour alone (04 §6). */
export function StatusBadge({ status }: { status: PdfStatus }) {
  return (
    <Badge variant={variants[status]} className="capitalize">
      {status === "processing" && <Spinner data-icon="inline-start" />}
      {status}
    </Badge>
  )
}
