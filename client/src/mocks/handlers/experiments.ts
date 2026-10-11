import { http, HttpResponse } from "msw"

import type {
  Axis,
  CombinationStats,
  ExperimentSummary,
  MarginalStats,
} from "@/api/types"

import { db } from "../db"
import { API, authenticate, latency } from "../http"

/**
 * Synthetic ratings, the mock's equivalent of `docchat seed experiments`, so
 * the dashboard has something to compare. Real votes are added on top.
 */
const seeded: Omit<CombinationStats, "scores" | "mean">[] = [
  {
    llm: "haiku-5-5",
    retriever: "mmr_k4",
    memory: "window_6",
    conversations: 9,
    up: 21,
    down: 4,
  },
  {
    llm: "haiku-5-5",
    retriever: "mmr_k4",
    memory: "buffer",
    conversations: 6,
    up: 12,
    down: 4,
  },
  {
    llm: "haiku-5-5",
    retriever: "sim_k4",
    memory: "window_6",
    conversations: 5,
    up: 9,
    down: 6,
  },
  {
    llm: "haiku-5-5",
    retriever: "mmr_k8",
    memory: "summary",
    conversations: 4,
    up: 7,
    down: 3,
  },
  {
    llm: "haiku-5-5",
    retriever: "sim_k4",
    memory: "buffer",
    conversations: 3,
    up: 4,
    down: 5,
  },
  {
    llm: "haiku-4-5",
    retriever: "mmr_k4",
    memory: "window_6",
    conversations: 4,
    up: 8,
    down: 2,
  },
  {
    llm: "haiku-4-5",
    retriever: "sim_k4",
    memory: "buffer",
    conversations: 3,
    up: 3,
    down: 6,
  },
  {
    llm: "haiku-4-5",
    retriever: "mmr_k8",
    memory: "summary",
    conversations: 2,
    up: 1,
    down: 2,
  },
  {
    llm: "haiku-4-5",
    retriever: "mmr_k8",
    memory: "window_6",
    conversations: 1,
    up: 2,
    down: 0,
  },
]

const key = (c: Pick<CombinationStats, Axis>) =>
  `${c.llm}|${c.retriever}|${c.memory}`

function finalize<T extends { up: number; down: number }>(row: T) {
  const scores = row.up + row.down
  return {
    ...row,
    scores,
    mean: scores ? Number(((row.up - row.down) / scores).toFixed(3)) : null,
  }
}

export function buildSummary(
  userId: string,
  includePinned: boolean
): ExperimentSummary {
  const rows = new Map<string, Omit<CombinationStats, "scores" | "mean">>()
  for (const s of seeded) rows.set(key(s), { ...s })

  const conversations = db().conversations.filter(
    (c) => c.user_id === userId && (includePinned || !c.pinned)
  )
  for (const c of conversations) {
    const k = key(c.components)
    const row = rows.get(k) ?? {
      ...c.components,
      conversations: 0,
      up: 0,
      down: 0,
    }
    row.conversations += 1
    for (const m of db().messages) {
      if (m.conversation_id !== c.id || !m.score) continue
      if (m.score.value === 1) row.up += 1
      else row.down += 1
    }
    rows.set(k, row)
  }

  const combinations = [...rows.values()].map(finalize)
  const marginals = Object.fromEntries(
    (["llm", "retriever", "memory"] as Axis[]).map((axis) => {
      const byArm = new Map<string, { arm: string; up: number; down: number }>()
      for (const c of combinations) {
        const arm = byArm.get(c[axis]) ?? { arm: c[axis], up: 0, down: 0 }
        arm.up += c.up
        arm.down += c.down
        byArm.set(c[axis], arm)
      }
      return [axis, [...byArm.values()].map(finalize)]
    })
  ) as Record<Axis, MarginalStats[]>

  return { combinations, marginals, generated_at: new Date().toISOString() }
}

export const experimentHandlers = [
  http.get(`${API}/experiments/summary`, async ({ request }) => {
    await latency()
    const user = authenticate(request)
    if (user instanceof Response) return user
    const includePinned =
      new URL(request.url).searchParams.get("include_pinned") === "true"
    return HttpResponse.json(buildSummary(user.id, includePinned))
  }),
]
