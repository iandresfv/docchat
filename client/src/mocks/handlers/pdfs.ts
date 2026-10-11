import { http, HttpResponse } from "msw"

import type { Pdf, PdfDetail } from "@/api/types"

import { db, type MockPdf, now, persist, uuid } from "../db"
import { API, authenticate, latency, problem } from "../http"

const PENDING_MS = 2_500
const PROCESSING_MS = 9_000
const MAX_BYTES = 20 * 1024 * 1024

/** Derives the observable PDF from the simulated ingestion timeline. */
export function toPdf(row: MockPdf): Pdf {
  const conversation_count = conversationCount(row.id)
  const {
    user_id: _u,
    final_status,
    final_page_count,
    frozen_status,
    ...base
  } = row
  if (frozen_status)
    return { ...base, status: frozen_status, conversation_count }

  const elapsed = Date.now() - new Date(row.created_at).getTime()
  if (elapsed < PENDING_MS)
    return { ...base, status: "pending", conversation_count }
  if (elapsed < PROCESSING_MS) {
    return { ...base, status: "processing", conversation_count }
  }
  if (final_status === "failed") {
    return {
      ...base,
      status: "failed",
      error: "PdfUnreadable: no extractable text (scanned document?)",
      conversation_count,
    }
  }
  return {
    ...base,
    status: "ready",
    page_count: final_page_count,
    chunk_count: Math.round(final_page_count * 2.6),
    ingested_at:
      base.ingested_at ??
      new Date(
        new Date(row.created_at).getTime() + PROCESSING_MS
      ).toISOString(),
    conversation_count,
  }
}

/** Overridden once conversations exist in the mock db. */
let conversationCount: (pdfId: string) => number = () => 0
export function setConversationCounter(fn: (pdfId: string) => number) {
  conversationCount = fn
}

export function findPdf(userId: string, id: string): MockPdf | undefined {
  return db().pdfs.find((p) => p.id === id && p.user_id === userId)
}

export function notFound(what: string, id: string) {
  return problem(404, "not-found", "Not Found", `${what} ${id} does not exist`)
}

/** Download URL: the mock serves a bundled sample PDF for every document. */
let sampleUrl = "/sample.pdf"
export function setSamplePdfUrl(url: string) {
  sampleUrl = url
}

export function toDetail(row: MockPdf): PdfDetail {
  return {
    ...toPdf(row),
    download_url: sampleUrl,
    download_url_expires_at: new Date(Date.now() + 600_000).toISOString(),
  }
}

interface Upload {
  name: string
  size: number
  isPdf: boolean
}

/**
 * Reads the multipart `file` field. Falls back to parsing the raw body
 * because jsdom's XHR multipart encoding trips undici's parser in tests.
 */
async function readUpload(request: Request): Promise<Upload | null> {
  try {
    const file = (await request.clone().formData()).get("file")
    if (!(file instanceof File)) return null
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
    return {
      name: file.name,
      size: file.size,
      isPdf: String.fromCharCode(...head) === "%PDF-",
    }
  } catch {
    const raw = await request.text()
    const name = /filename="([^"]+)"/.exec(raw)?.[1]
    if (!name) return null
    const body = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n")
    return { name, size: body.length, isPdf: body.startsWith("%PDF-") }
  }
}

export const pdfHandlers = [
  http.get(`${API}/pdfs`, async ({ request }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get("limit") ?? 20)
    const offset = Number(url.searchParams.get("offset") ?? 0)
    const status = url.searchParams.get("status")
    const items = db()
      .pdfs.filter((p) => p.user_id === user.id)
      .map(toPdf)
      .filter((p) => !status || p.status === status)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return HttpResponse.json({
      items: items.slice(offset, offset + limit),
      total: items.length,
      limit,
      offset,
    })
  }),

  http.get(`${API}/pdfs/:id`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const row = findPdf(user.id, String(params.id))
    return row
      ? HttpResponse.json(toDetail(row))
      : notFound("pdf", String(params.id))
  }),

  http.post(`${API}/pdfs`, async ({ request }) => {
    const user = authenticate(request)
    if (user instanceof Response) return user
    const file = await readUpload(request)
    await latency(400)
    if (!file) {
      return problem(
        422,
        "validation-error",
        "Validation Error",
        "file is required",
        {
          errors: [{ loc: ["body", "file"], msg: "Field required" }],
        }
      )
    }
    if (file.size > MAX_BYTES) {
      return problem(413, "payload-too-large", "Payload Too Large", "max 20 MB")
    }
    if (!file.isPdf && !file.name.toLowerCase().endsWith(".pdf")) {
      return problem(415, "unsupported-media-type", "Unsupported Media Type")
    }
    // Deterministic knobs to exercise every UI path from the browser.
    const lower = file.name.toLowerCase()
    if (lower.includes("toolong")) {
      return problem(
        422,
        "validation-error",
        "Validation Error",
        "PDF has 312 pages"
      )
    }
    const pages = Math.max(1, Math.min(200, Math.round(file.size / 60_000)))
    const row: MockPdf = {
      id: uuid(),
      user_id: user.id,
      name: file.name,
      size_bytes: file.size,
      page_count: null,
      chunk_count: null,
      error: null,
      created_at: now(),
      ingested_at: null,
      final_status:
        lower.includes("scan") || lower.includes("fail") ? "failed" : "ready",
      final_page_count: pages,
    }
    db().pdfs.push(row)
    persist()
    return HttpResponse.json(toPdf(row), { status: 202 })
  }),

  http.delete(`${API}/pdfs/:id`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const id = String(params.id)
    if (!findPdf(user.id, id)) return notFound("pdf", id)
    db().pdfs = db().pdfs.filter((p) => p.id !== id)
    onPdfDeleted(id)
    persist()
    return new HttpResponse(null, { status: 204 })
  }),
]

/** Cascade hook (conversations/messages) set by later handlers. */
let onPdfDeleted: (pdfId: string) => void = () => undefined
export function setPdfDeleteCascade(fn: (pdfId: string) => void) {
  onPdfDeleted = fn
}
