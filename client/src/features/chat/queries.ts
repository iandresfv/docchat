import {
  useMutation,
  useMutationState,
  useQueryClient,
} from "@tanstack/react-query"

import { messagesApi } from "@/api/endpoints/messages"
import type { ApiError } from "@/api/errors"
import type {
  ConversationDetail,
  ConversationSummary,
  Message,
  SendMessageResponse,
} from "@/api/types"
import { conversationKeys } from "@/features/workspace/queries"

export const OPTIMISTIC_PREFIX = "optimistic:"

export function optimisticHuman(
  conversationId: string,
  content: string,
  seq: number
): Message {
  return {
    id: `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`,
    conversation_id: conversationId,
    seq,
    role: "human",
    content,
    created_at: new Date().toISOString(),
  }
}

/** Appends/replaces messages in the cached conversation detail. */
export function useConversationCache() {
  const queryClient = useQueryClient()

  const update = (
    conversationId: string,
    fn: (messages: Message[]) => Message[]
  ) => {
    queryClient.setQueryData<ConversationDetail>(
      conversationKeys.detail(conversationId),
      (detail) =>
        detail ? { ...detail, messages: fn(detail.messages) } : detail
    )
  }

  const touchSummary = (
    pdfId: string,
    conversationId: string,
    added: number
  ) => {
    queryClient.setQueryData<ConversationSummary[]>(
      conversationKeys.forPdf(pdfId),
      (list) =>
        list?.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                message_count: c.message_count + added,
                last_message_at: new Date().toISOString(),
              }
            : c
        )
    )
  }

  const nextSeq = (conversationId: string) => {
    const detail = queryClient.getQueryData<ConversationDetail>(
      conversationKeys.detail(conversationId)
    )
    return (detail?.messages.at(-1)?.seq ?? 0) + 1
  }

  return { update, touchSummary, nextSeq, queryClient }
}

export const sendMessageKey = ["send-message"] as const

export interface SendVars {
  conversationId: string
  pdfId: string
  content: string
  optimisticId: string
}

/**
 * Non-streaming send (F3). The human message is inserted optimistically by
 * the caller; on success it's replaced by the server copy plus the answer.
 * On error it stays, and the caller renders the error inline.
 */
export function useSendMessage() {
  const cache = useConversationCache()
  return useMutation<SendMessageResponse, ApiError, SendVars>({
    mutationKey: sendMessageKey,
    mutationFn: ({ conversationId, content }) =>
      messagesApi.send(conversationId, content),
    meta: { silent: true },
    onSuccess: (res, { conversationId, pdfId, optimisticId }) => {
      cache.update(conversationId, (messages) => [
        ...messages.filter((m) => m.id !== optimisticId),
        res.user_message,
        res.assistant_message,
      ])
      cache.touchSummary(pdfId, conversationId, 2)
    },
  })
}

export interface TurnState {
  status: "idle" | "pending" | "error"
  error: ApiError | null
  variables: SendVars | null
  submittedAt: number
}

/**
 * Latest send for a conversation, read from the mutation cache so it survives
 * remounts (e.g. the first message creates the conversation and re-keys the
 * panel).
 */
export function useLatestTurn(conversationId: string | undefined): TurnState {
  const states = useMutationState({
    filters: { mutationKey: sendMessageKey },
    select: (m) => ({
      status: m.state.status,
      error: m.state.error as ApiError | null,
      variables: m.state.variables as SendVars | undefined,
      submittedAt: m.state.submittedAt,
    }),
  })
  const latest = states
    .filter((s) => s.variables?.conversationId === conversationId)
    .at(-1)
  if (!latest || (latest.status !== "pending" && latest.status !== "error")) {
    return { status: "idle", error: null, variables: null, submittedAt: 0 }
  }
  return {
    status: latest.status,
    error: latest.error,
    variables: latest.variables ?? null,
    submittedAt: latest.submittedAt,
  }
}
