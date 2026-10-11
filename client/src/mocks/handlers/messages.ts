import { http, HttpResponse } from "msw"

import type { Message } from "@/api/types"

import { mockAnswer } from "../answers"
import { db, now, persist, uuid } from "../db"
import { API, authenticate, latency, problem } from "../http"
import { findConversation } from "./conversations"
import { findPdf, notFound, toPdf } from "./pdfs"

const MAX_CHARS = 4000

/** Shared checks for the plain and streaming endpoints (01 §9). */
export async function prepareTurn(request: Request, conversationId: string) {
  const user = authenticate(request)
  if (user instanceof Response) return { error: user }
  const conversation = findConversation(user.id, conversationId)
  if (!conversation) return { error: notFound("conversation", conversationId) }
  const pdf = findPdf(user.id, conversation.pdf_id)
  if (!pdf || toPdf(pdf).status !== "ready") {
    return {
      error: problem(
        409,
        "pdf-not-ready",
        "PDF Not Ready",
        "pdf is still processing"
      ),
    }
  }
  const { content } = (await request.json()) as { content?: string }
  const text = content?.trim() ?? ""
  if (!text || text.length > MAX_CHARS) {
    return {
      error: problem(422, "validation-error", "Validation Error", undefined, {
        errors: [
          {
            loc: ["body", "content"],
            msg: "String should have 1 to 4000 characters",
          },
        ],
      }),
    }
  }
  // Deterministic knobs to exercise the error UI from the browser.
  if (text.includes("/ratelimit")) {
    return {
      error: problem(
        429,
        "rate-limited",
        "Too Many Requests",
        "10 messages per minute",
        {
          headers: { "Retry-After": "15" },
        }
      ),
    }
  }
  if (text.includes("/budget")) {
    return {
      error: problem(
        429,
        "budget-exceeded",
        "Daily token budget exceeded",
        "Resets at midnight UTC",
        {
          headers: { "Retry-After": "30" },
        }
      ),
    }
  }
  if (text.includes("/error")) {
    return {
      error: problem(
        503,
        "upstream-unavailable",
        "Upstream Unavailable",
        "The model provider did not respond"
      ),
    }
  }

  const messages = db().messages.filter(
    (m) => m.conversation_id === conversation.id
  )
  const seq = (messages.at(-1)?.seq ?? 0) + 1
  const human: Message = {
    id: uuid(),
    conversation_id: conversation.id,
    seq,
    role: "human",
    content: text,
    created_at: now(),
  }
  db().messages.push(human)
  persist()
  const answer = mockAnswer(
    text,
    conversation.components.llm,
    Math.ceil(seq / 2)
  )
  return { conversation, human, answer }
}

export function assistantMessage(
  conversationId: string,
  seq: number,
  answer: ReturnType<typeof mockAnswer>,
  overrides: Partial<Message> = {}
): Message {
  return {
    id: uuid(),
    conversation_id: conversationId,
    seq,
    role: "assistant",
    content: answer.text,
    sources: answer.sources,
    usage: answer.usage,
    latency_ms: answer.latencyMs,
    finish_reason: "end_turn",
    created_at: now(),
    score: null,
    ...overrides,
  }
}

export const messageHandlers = [
  http.post(
    `${API}/conversations/:id/messages`,
    async ({ request, params }) => {
      await latency()
      const turn = await prepareTurn(request, String(params.id))
      if ("error" in turn) return turn.error
      await latency(turn.answer.latencyMs)
      const assistant = assistantMessage(
        turn.conversation.id,
        turn.human.seq + 1,
        turn.answer
      )
      db().messages.push(assistant)
      persist()
      return HttpResponse.json(
        { user_message: turn.human, assistant_message: assistant },
        { status: 201 }
      )
    }
  ),
]
