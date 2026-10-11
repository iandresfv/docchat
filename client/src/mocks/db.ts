/**
 * In-memory fake of the DocChat API state, persisted to localStorage so a
 * reload behaves like a real backend. Used by the dev mock mode
 * (`VITE_API_MOCKS=true`) and by the test suite.
 */
import type { User } from "@/api/types"

export interface MockUser extends User {
  password: string
}

export interface MockDb {
  users: MockUser[]
}

const STORAGE_KEY = "docchat.mock.db"
const REFRESH_KEY = "docchat.mock.refresh"

export const DEMO_USER = {
  email: "demo@docchat.dev",
  password: "docchat-demo",
} as const

function seed(): MockDb {
  return {
    users: [
      {
        id: "8c0f2a47-3a51-4d7e-9a43-0c1d1f6b2e11",
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
