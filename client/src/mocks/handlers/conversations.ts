import { http, HttpResponse } from "msw"

import type {
  Axis,
  ConversationDetail,
  ConversationSummary,
  CreateConversation,
} from "@/api/types"

import { catalog, enabledArms } from "../catalog"
import { db, type MockConversation, now, persist, uuid } from "../db"
import { API, authenticate, latency, problem } from "../http"
import {
  findPdf,
  notFound,
  setConversationCounter,
  setPdfDeleteCascade,
  toPdf,
} from "./pdfs"

const pick = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T

export function toSummary(row: MockConversation): ConversationSummary {
  const messages = db().messages.filter((m) => m.conversation_id === row.id)
  const { user_id: _u, ...base } = row
  return {
    ...base,
    message_count: messages.length,
    last_message_at: messages.at(-1)?.created_at ?? null,
  }
}

export function toDetail(row: MockConversation): ConversationDetail {
  return {
    ...toSummary(row),
    messages: db()
      .messages.filter((m) => m.conversation_id === row.id)
      .sort((a, b) => a.seq - b.seq),
  }
}

export function findConversation(userId: string, id: string) {
  return db().conversations.find((c) => c.id === id && c.user_id === userId)
}

function deleteConversationRows(ids: Set<string>) {
  db().conversations = db().conversations.filter((c) => !ids.has(c.id))
  db().messages = db().messages.filter((m) => !ids.has(m.conversation_id))
}

setConversationCounter(
  (pdfId) => db().conversations.filter((c) => c.pdf_id === pdfId).length
)
setPdfDeleteCascade((pdfId) => {
  deleteConversationRows(
    new Set(
      db()
        .conversations.filter((c) => c.pdf_id === pdfId)
        .map((c) => c.id)
    )
  )
})

export const conversationHandlers = [
  http.get(`${API}/pdfs/:pdfId/conversations`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const pdfId = String(params.pdfId)
    if (!findPdf(user.id, pdfId)) return notFound("pdf", pdfId)
    const items = db()
      .conversations.filter((c) => c.pdf_id === pdfId && c.user_id === user.id)
      .map(toSummary)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return HttpResponse.json({ items })
  }),

  http.post(`${API}/pdfs/:pdfId/conversations`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const pdfId = String(params.pdfId)
    const pdf = findPdf(user.id, pdfId)
    if (!pdf) return notFound("pdf", pdfId)
    if (toPdf(pdf).status !== "ready") {
      return problem(
        409,
        "pdf-not-ready",
        "PDF Not Ready",
        "pdf is still processing"
      )
    }
    const body = ((await request.json().catch(() => ({}))) ??
      {}) as CreateConversation
    const requested = body.components ?? {}
    for (const axis of ["llm", "retriever", "memory"] as Axis[]) {
      const arm = requested[axis]
      if (arm && !catalog[axis].some((a) => a.id === arm)) {
        return problem(
          422,
          "validation-error",
          "Validation Error",
          `unknown ${axis} arm`,
          {
            errors: [
              {
                loc: ["body", "components", axis],
                msg: `unknown arm '${arm}'`,
              },
            ],
          }
        )
      }
    }
    const pinned = Object.values(requested).some(Boolean)
    const count = db().conversations.filter((c) => c.pdf_id === pdfId).length
    const row: MockConversation = {
      id: uuid(),
      pdf_id: pdfId,
      user_id: user.id,
      title: body.title ?? `Conversation ${count + 1}`,
      components: {
        llm: requested.llm ?? pick(enabledArms("llm")),
        retriever: requested.retriever ?? pick(enabledArms("retriever")),
        memory: requested.memory ?? pick(enabledArms("memory")),
      },
      pinned,
      created_at: now(),
    }
    db().conversations.push(row)
    persist()
    return HttpResponse.json(toSummary(row), { status: 201 })
  }),

  http.get(`${API}/conversations/:id`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const row = findConversation(user.id, String(params.id))
    return row
      ? HttpResponse.json(toDetail(row))
      : notFound("conversation", String(params.id))
  }),

  http.patch(`${API}/conversations/:id`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const row = findConversation(user.id, String(params.id))
    if (!row) return notFound("conversation", String(params.id))
    const { title } = (await request.json()) as { title?: string }
    if (!title?.trim() || title.length > 120) {
      return problem(
        422,
        "validation-error",
        "Validation Error",
        "title must be 1-120 chars",
        {
          errors: [
            {
              loc: ["body", "title"],
              msg: "String should have 1 to 120 characters",
            },
          ],
        }
      )
    }
    row.title = title.trim()
    persist()
    return HttpResponse.json(toSummary(row))
  }),

  http.delete(`${API}/conversations/:id`, async ({ request, params }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const id = String(params.id)
    if (!findConversation(user.id, id)) return notFound("conversation", id)
    deleteConversationRows(new Set([id]))
    persist()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/experiments/components`, async ({ request }) => {
    await latency(100)
    const user = authenticate(request)
    if (user instanceof Response) return user
    return HttpResponse.json(catalog)
  }),
]
