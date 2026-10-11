import { http, HttpResponse } from "msw"

import type { ScoreRequest } from "@/api/types"

import { db, persist } from "../db"
import { API, authenticate, latency, problem } from "../http"
import { findConversation } from "./conversations"
import { notFound } from "./pdfs"

function findOwnMessage(userId: string, id: string) {
  const message = db().messages.find((m) => m.id === id)
  if (!message || !findConversation(userId, message.conversation_id))
    return undefined
  return message
}

export const scoreHandlers = [
  http.put(`${API}/messages/:id/score`, async ({ request, params }) => {
    await latency(150)
    const user = authenticate(request)
    if (user instanceof Response) return user
    const id = String(params.id)
    const message = findOwnMessage(user.id, id)
    if (!message) return notFound("message", id)
    if (message.role !== "assistant") {
      return problem(
        422,
        "validation-error",
        "Validation Error",
        "only assistant messages can be scored"
      )
    }
    const body = (await request.json()) as Partial<ScoreRequest> & {
      value?: number
    }
    if (body.value !== 1 && body.value !== -1) {
      return problem(
        422,
        "validation-error",
        "Validation Error",
        "value must be 1 or -1",
        {
          errors: [{ loc: ["body", "value"], msg: "Input should be 1 or -1" }],
        }
      )
    }
    const comment = body.comment?.slice(0, 500) ?? null
    message.score = { value: body.value, comment }
    persist()
    return HttpResponse.json({ message_id: id, value: body.value, comment })
  }),

  http.delete(`${API}/messages/:id/score`, async ({ request, params }) => {
    await latency(150)
    const user = authenticate(request)
    if (user instanceof Response) return user
    const id = String(params.id)
    const message = findOwnMessage(user.id, id)
    if (!message?.score) return notFound("score", id)
    message.score = null
    persist()
    return new HttpResponse(null, { status: 204 })
  }),
]
