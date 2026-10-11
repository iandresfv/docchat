/**
 * In-memory fake of the DocChat API state, persisted to localStorage so a
 * reload behaves like a real backend. Used by the dev mock mode
 * (`VITE_API_MOCKS=true`) and by the test suite.
 */
import type { Pdf, PdfStatus, User } from "@/api/types"

export interface MockUser extends User {
  password: string
}

export interface MockPdf extends Omit<Pdf, "status" | "conversation_count"> {
  user_id: string
  /** Simulated ingestion: status derives from the time since upload. */
  final_status: "ready" | "failed"
  final_page_count: number
  /** Fixed status for seeded rows that should not progress. */
  frozen_status?: PdfStatus
}

export interface MockDb {
  users: MockUser[]
  pdfs: MockPdf[]
}

const STORAGE_KEY = "docchat.mock.db"
const REFRESH_KEY = "docchat.mock.refresh"

export const DEMO_USER = {
  email: "demo@docchat.dev",
  password: "docchat-demo",
} as const

export const DEMO_USER_ID = "8c0f2a47-3a51-4d7e-9a43-0c1d1f6b2e11"

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString()

function seedPdf(
  id: string,
  name: string,
  pages: number,
  sizeBytes: number,
  createdAt: string,
  extra: Partial<MockPdf> = {}
): MockPdf {
  return {
    id,
    user_id: DEMO_USER_ID,
    name,
    size_bytes: sizeBytes,
    page_count: pages,
    chunk_count: Math.round(pages * 2.6),
    error: null,
    created_at: createdAt,
    ingested_at: createdAt,
    final_status: "ready",
    final_page_count: pages,
    ...extra,
  }
}

export const SEED_PDF_IDS = {
  report: "3f6b1c2e-8d4a-4f61-9b0e-5a7c2d9e1f01",
  handbook: "3f6b1c2e-8d4a-4f61-9b0e-5a7c2d9e1f02",
  paper: "3f6b1c2e-8d4a-4f61-9b0e-5a7c2d9e1f03",
  scanned: "3f6b1c2e-8d4a-4f61-9b0e-5a7c2d9e1f04",
} as const

function seed(): MockDb {
  return {
    pdfs: [
      seedPdf(
        SEED_PDF_IDS.report,
        "Annual report 2025.pdf",
        12,
        1_258_291,
        daysAgo(2)
      ),
      seedPdf(
        SEED_PDF_IDS.handbook,
        "Employee handbook v4.pdf",
        12,
        842_137,
        daysAgo(9)
      ),
      seedPdf(
        SEED_PDF_IDS.paper,
        "Attention is all you need.pdf",
        12,
        2_215_904,
        daysAgo(21)
      ),
      seedPdf(
        SEED_PDF_IDS.scanned,
        "Signed contract (scanned).pdf",
        4,
        3_481_221,
        daysAgo(1),
        {
          page_count: null,
          chunk_count: null,
          ingested_at: null,
          error: "PdfUnreadable: no extractable text (scanned document?)",
          final_status: "failed",
          frozen_status: "failed",
        }
      ),
    ],
    users: [
      {
        id: DEMO_USER_ID,
        email: DEMO_USER.email,
        password: DEMO_USER.password,
        created_at: "2026-09-01T12:00:00Z",
      },
    ],
  }
}

let state: MockDb | null = null

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...seed(), ...(JSON.parse(raw) as Partial<MockDb>) }
  } catch {
    // corrupted or unavailable storage: start from the seed
  }
  return seed()
}

export function db(): MockDb {
  state ??= load()
  return state
}

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db()))
  } catch {
    // ignore quota/private-mode errors
  }
}

export function resetDb() {
  state = seed()
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // ignore
  }
}

/** Stand-in for the HttpOnly refresh cookie. */
export const refreshCookie = {
  get: (): string | null => {
    try {
      return localStorage.getItem(REFRESH_KEY)
    } catch {
      return null
    }
  },
  set: (userId: string) => {
    localStorage.setItem(REFRESH_KEY, userId)
  },
  clear: () => {
    localStorage.removeItem(REFRESH_KEY)
  },
}

export function uuid(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}
