import type { Pdf } from "@/api/types"
import { formatBytes, pluralize } from "@/lib/format"

/** "12 pages · 1.2 MB · 3 conversations" (04 §4.2). */
export function pdfMetaLine(pdf: Pdf): string {
  const parts: string[] = []
  if (pdf.page_count !== null) parts.push(pluralize(pdf.page_count, "page"))
  parts.push(formatBytes(pdf.size_bytes))
  if (pdf.conversation_count !== undefined) {
    parts.push(pluralize(pdf.conversation_count, "conversation"))
  }
  return parts.join(" · ")
}
