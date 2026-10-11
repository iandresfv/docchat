import { ApiError, isApiError } from "@/api/errors"
import { streamMessage } from "@/api/sse"
import type { Message } from "@/api/types"
import { conversationKeys } from "@/features/workspace/queries"
import { useStreamStore } from "@/stores/stream"

import { type SendVars, useConversationCache } from "./queries"

/**
 * Streams one turn into the stream store (F4). Deltas are batched per
 * animation frame so a fast stream doesn't re-render once per token.
 */
export function useStreamAnswer() {
  const cache = useConversationCache()

  return async ({ conversationId, pdfId, content, optimisticId }: SendVars) => {
    const store = useStreamStore.getState()
    const controller = new AbortController()
    store.start(conversationId, {
      userMessageId: optimisticId,
      assistantMessageId: null,
      content: "",
      sources: null,
      usage: null,
      controller,
    })

    let buffer = ""
    let frame = 0
    // Mutated from the event callback; an object keeps TS from narrowing it.
    const outcome: { ended: boolean; serverError: ApiError | null } = {
      ended: false,
      serverError: null,
    }
    const flush = () => {
      frame = 0
      if (buffer) {
        useStreamStore.getState().append(conversationId, buffer)
        buffer = ""
      }
    }

    // Keeps whatever arrived as a partial answer until the refetch replaces it.
    const keepPartial = (finishReason: Message["finish_reason"]) => {
      flush()
      const draft = useStreamStore.getState().drafts[conversationId]
      if (draft?.assistantMessageId && draft.content) {
        cache.update(conversationId, (messages) => [
          ...messages,
          {
            id: draft.assistantMessageId ?? "",
            conversation_id: conversationId,
            seq: (messages.at(-1)?.seq ?? 0) + 1,
            role: "assistant",
            content: draft.content,
            sources: draft.sources,
            finish_reason: finishReason,
            created_at: new Date().toISOString(),
          },
        ])
      }
      useStreamStore.getState().finish(conversationId)
      void cache.queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(conversationId),
      })
      void cache.queryClient.invalidateQueries({
        queryKey: conversationKeys.forPdf(pdfId),
      })
    }

    try {
      await streamMessage(conversationId, content, {
        signal: controller.signal,
        onEvent: (event) => {
          const live = useStreamStore.getState()
          switch (event.type) {
            case "message_start":
              cache.update(conversationId, (messages) =>
                messages.map((m) =>
                  m.id === optimisticId
                    ? {
                        ...m,
                        id: event.data.user_message_id,
                        seq: event.data.seq,
                      }
                    : m
                )
              )
              live.patch(conversationId, {
                userMessageId: event.data.user_message_id,
                assistantMessageId: event.data.assistant_message_id,
              })
              break
            case "sources":
              live.patch(conversationId, { sources: event.data })
              break
            case "delta":
              buffer += event.data.text
              frame ||= requestAnimationFrame(flush)
              break
            case "usage":
              live.patch(conversationId, { usage: event.data })
              break
            case "message_end":
              cancelAnimationFrame(frame)
              outcome.ended = true
              cache.update(conversationId, (messages) => [
                ...messages,
                event.data.assistant_message,
              ])
              cache.touchSummary(pdfId, conversationId, 2)
              live.finish(conversationId)
              break
            case "error":
              outcome.serverError = new ApiError(event.data)
              controller.abort()
              break
          }
        },
      })
      if (!outcome.ended) keepPartial("error")
    } catch (error) {
      cancelAnimationFrame(frame)
      if (outcome.serverError) {
        keepPartial("error")
        useStreamStore.getState().fail(conversationId, {
          error: outcome.serverError,
          content,
          userMessageId: optimisticId,
          at: Date.now(),
        })
      } else if (isApiError(error) && error.slug === "aborted") {
        keepPartial("client_disconnect")
      } else if (
        useStreamStore.getState().drafts[conversationId]?.assistantMessageId
      ) {
        // Dropped mid-stream: the server stored the partial; resync.
        keepPartial("error")
      } else {
        useStreamStore.getState().fail(conversationId, {
          error: isApiError(error) ? error : ApiError.network(error),
          content,
          userMessageId: optimisticId,
          at: Date.now(),
        })
      }
    }
  }
}
