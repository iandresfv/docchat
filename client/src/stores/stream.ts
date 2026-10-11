import { create } from "zustand"

import type { ApiError } from "@/api/errors"
import type { Source, StreamUsage } from "@/api/types"

export interface StreamDraft {
  /** Optimistic id until `message_start` brings the server ids. */
  userMessageId: string
  assistantMessageId: string | null
  content: string
  sources: Source[] | null
  usage: StreamUsage | null
  controller: AbortController
}

export interface StreamFailure {
  error: ApiError
  content: string
  userMessageId: string
  at: number
}

interface StreamState {
  drafts: Record<string, StreamDraft | undefined>
  failures: Record<string, StreamFailure | undefined>
  start: (conversationId: string, draft: StreamDraft) => void
  patch: (conversationId: string, patch: Partial<StreamDraft>) => void
  append: (conversationId: string, text: string) => void
  finish: (conversationId: string) => void
  fail: (conversationId: string, failure: StreamFailure) => void
  clearFailure: (conversationId: string) => void
}

/** Assistant drafts per conversation while answers stream (F4). */
export const useStreamStore = create<StreamState>()((set) => ({
  drafts: {},
  failures: {},
  start: (id, draft) =>
    set((s) => ({
      drafts: { ...s.drafts, [id]: draft },
      failures: { ...s.failures, [id]: undefined },
    })),
  patch: (id, patch) =>
    set((s) => {
      const draft = s.drafts[id]
      return draft
        ? { drafts: { ...s.drafts, [id]: { ...draft, ...patch } } }
        : s
    }),
  append: (id, text) =>
    set((s) => {
      const draft = s.drafts[id]
      return draft
        ? {
            drafts: {
              ...s.drafts,
              [id]: { ...draft, content: draft.content + text },
            },
          }
        : s
    }),
  finish: (id) => set((s) => ({ drafts: { ...s.drafts, [id]: undefined } })),
  fail: (id, failure) =>
    set((s) => ({
      drafts: { ...s.drafts, [id]: undefined },
      failures: { ...s.failures, [id]: failure },
    })),
  clearFailure: (id) =>
    set((s) => ({ failures: { ...s.failures, [id]: undefined } })),
}))
