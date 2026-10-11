import { create } from "zustand"

import type { User } from "@/api/types"

export type SessionStatus = "unknown" | "authenticated" | "anonymous"

interface SessionState {
  status: SessionStatus
  /** Access JWT, kept in memory only (ADR-09). */
  accessToken: string | null
  user: User | null
  /** Why the session ended, so the UI can explain it once. */
  endReason: "signout" | "expired" | null
  setAccessToken: (token: string) => void
  signedIn: (token: string, user: User) => void
  signedOut: (reason: "signout" | "expired" | null) => void
}

export const useSession = create<SessionState>()((set) => ({
  status: "unknown",
  accessToken: null,
  user: null,
  endReason: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  signedIn: (accessToken, user) =>
    set({ status: "authenticated", accessToken, user, endReason: null }),
  signedOut: (endReason) =>
    set({ status: "anonymous", accessToken: null, user: null, endReason }),
}))
