/** Mirrors MAX_UPLOAD_BYTES / MAX_PDF_PAGES (01 §10); the server re-checks. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const MAX_PDF_PAGES = 200

const uploadErrors: Record<number, string> = {
  413: "File is larger than 20 MB",
  415: "Only PDF files are accepted",
  422: "PDF has more than 200 pages",
  429: "Upload limit reached, try again later",
}

export function uploadErrorMessage(status: number, fallback: string): string {
  return uploadErrors[status] ?? fallback
}

/** Client-side pre-check; returns an error message or null. */
export function validatePdfFile(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  if (!isPdf) return uploadErrors[415] ?? null
  if (file.size > MAX_UPLOAD_BYTES) return uploadErrors[413] ?? null
  return null
}
