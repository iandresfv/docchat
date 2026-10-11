import { createParser } from "eventsource-parser"

import { ApiError, type Problem } from "./errors"
import { rawRequest } from "./http"
import type {
  Source,
  StreamMessageEnd,
  StreamMessageStart,
  StreamUsage,
} from "./types"

/** Typed SSE events of `POST /conversations/{id}/messages/stream` (01 §8.3). */
export type StreamEvent =
  | { type: "message_start"; data: StreamMessageStart }
  | { type: "sources"; data: Source[] }
  | { type: "delta"; data: { text: string } }
  | { type: "usage"; data: StreamUsage }
  | { type: "message_end"; data: StreamMessageEnd }
  | { type: "error"; data: Problem }

const KNOWN = new Set<StreamEvent["type"]>([
  "message_start",
  "sources",
  "delta",
  "usage",
  "message_end",
  "error",
])

export interface StreamOptions {
  signal?: AbortSignal
  onEvent: (event: StreamEvent) => void
}

/**
 * Streams an answer with fetch + eventsource-parser. `EventSource` can't send
 * a Bearer header or POST a body (ADR-09), hence fetch. Errors before the
 * headers reject with an ApiError; errors after arrive as `event: error`.
 */
export async function streamMessage(
  conversationId: string,
  content: string,
  { signal, onEvent }: StreamOptions
): Promise<void> {
  const response = await rawRequest(
    `/conversations/${conversationId}/messages/stream`,
    {
      method: "POST",
      body: { content },
      signal,
      headers: { Accept: "text/event-stream" },
    }
  )
  if (!response.body) throw ApiError.network(new Error("Empty stream"))

  const parser = createParser({
    onEvent: (message) => {
      const type = (message.event ?? "message") as StreamEvent["type"]
      if (!KNOWN.has(type)) return
      try {
        const data: unknown = JSON.parse(message.data)
        onEvent({ type, data } as StreamEvent)
      } catch {
        // Ignore malformed frames rather than killing the stream.
      }
    },
  })

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  // Not every runtime rejects a pending read on abort; cancel it explicitly.
  const cancel = () => void reader.cancel().catch(() => undefined)
  signal?.addEventListener("abort", cancel, { once: true })
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parser.feed(value)
    }
    if (signal?.aborted) throw ApiError.aborted()
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (signal?.aborted) throw ApiError.aborted()
    throw ApiError.network(error)
  } finally {
    signal?.removeEventListener("abort", cancel)
    reader.releaseLock()
  }
}
