import { http, HttpResponse } from "msw"

import type { UsagePeriod } from "@/api/types"

import { db } from "../db"
import { API, authenticate, latency } from "../http"

const DAILY_TOKENS = 300_000

export const usageHandlers = [
  http.get(`${API}/usage/me`, async ({ request }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const mine = new Set(
      db()
        .conversations.filter((c) => c.user_id === user.id)
        .map((c) => c.id)
    )
    const now = new Date()
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime()
    const empty = (): UsagePeriod => ({ tokens: 0, cost_usd: 0, messages: 0 })
    const today = empty()
    const month = empty()
    for (const m of db().messages) {
      if (!mine.has(m.conversation_id) || m.role !== "assistant" || !m.usage)
        continue
      const at = new Date(m.created_at).getTime()
      const tokens = m.usage.input_tokens + m.usage.output_tokens
      for (const [period, from] of [
        [today, startOfDay],
        [month, startOfMonth],
      ] as const) {
        if (at < from) continue
        period.tokens += tokens
        period.cost_usd += m.usage.cost_usd
        period.messages += 1
      }
    }
    return HttpResponse.json({
      today,
      month,
      limits: { daily_tokens: DAILY_TOKENS },
    })
  }),
]
