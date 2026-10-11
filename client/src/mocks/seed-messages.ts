import type { Message, Source } from "@/api/types"

const src = (page: number, score: number, snippet: string): Source => ({
  chunk_id: `seed:${String(page).padStart(4, "0")}:0000`,
  page,
  score,
  snippet,
})

/** Two realistic conversations about "Annual report 2025.pdf". */
export function seedMessages(c1: string, c2: string, t0: number): Message[] {
  const at = (minutes: number) => new Date(t0 + minutes * 60_000).toISOString()
  return [
    {
      id: "a1000000-0000-4000-8000-000000000001",
      conversation_id: c1,
      seq: 1,
      role: "human",
      content: "How much did revenue grow in 2025?",
      created_at: at(0),
    },
    {
      id: "a1000000-0000-4000-8000-000000000002",
      conversation_id: c1,
      seq: 2,
      role: "assistant",
      content:
        "Revenue grew **18% year over year**, from $36.1 million in 2024 to **$42.6 million** in 2025 [p.5]. Subscription revenue made up 86% of the total [p.5].\n\nThe report attributes the growth to two drivers [p.5]:\n\n- expansion within existing enterprise accounts, and\n- the launch of the self-serve plan in the second quarter.\n\nNet revenue retention reached 121% [p.4].",
      sources: [
        src(
          5,
          0.86,
          "Total revenue was $42.6 million, up 18% from $36.1 million in 2024. Subscription revenue represented 86% of the total."
        ),
        src(
          4,
          0.79,
          "Revenue grew 18% year over year to $42.6 million. Gross margin improved from 71% to 74%. Net revenue retention reached 121%."
        ),
        src(
          12,
          0.61,
          "For 2026 we expect revenue growth of 15% to 20% and stable gross margins."
        ),
      ],
      usage: {
        model: "claude-haiku-5-5",
        input_tokens: 3_912,
        output_tokens: 118,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        cost_usd: 0.00045,
      },
      latency_ms: 1_640,
      finish_reason: "end_turn",
      created_at: at(0.1),
      score: { value: 1, comment: null },
    },
    {
      id: "a1000000-0000-4000-8000-000000000003",
      conversation_id: c1,
      seq: 3,
      role: "human",
      content: "And what do they expect for next year?",
      created_at: at(2),
    },
    {
      id: "a1000000-0000-4000-8000-000000000004",
      conversation_id: c1,
      seq: 4,
      role: "assistant",
      content:
        "For 2026 the company expects **revenue growth of 15% to 20%** with stable gross margins [p.12]. Its stated priorities are multi-document reasoning, enterprise controls and expanding the partner ecosystem [p.12].",
      sources: [
        src(
          12,
          0.88,
          "For 2026 we expect revenue growth of 15% to 20% and stable gross margins. Priorities: multi-document reasoning, enterprise controls and expanding the partner ecosystem."
        ),
        src(
          3,
          0.64,
          "We enter 2026 with a healthy balance sheet and a clear plan."
        ),
      ],
      usage: {
        model: "claude-haiku-5-5",
        input_tokens: 4_206,
        output_tokens: 74,
        cache_read_tokens: 2_048,
        cache_write_tokens: 0,
        cost_usd: 0.00027,
      },
      latency_ms: 1_210,
      finish_reason: "end_turn",
      created_at: at(2.1),
      score: null,
    },
    {
      id: "a2000000-0000-4000-8000-000000000001",
      conversation_id: c2,
      seq: 1,
      role: "human",
      content: "What are the main risks?",
      created_at: at(60),
    },
    {
      id: "a2000000-0000-4000-8000-000000000002",
      conversation_id: c2,
      seq: 2,
      role: "assistant",
      content:
        "The report lists four principal risks [p.10]:\n\n1. Dependence on third-party model providers.\n2. Pricing pressure from larger platforms.\n3. Data-protection regulation.\n4. Revenue concentration — the top 20 customers account for **31%** of revenue.",
      sources: [
        src(
          10,
          0.91,
          "Principal risks include dependence on third-party model providers, pricing pressure from larger platforms, data-protection regulation and the concentration of revenue in the top 20 customers (31%)."
        ),
      ],
      usage: {
        model: "claude-haiku-4-5",
        input_tokens: 3_480,
        output_tokens: 96,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        cost_usd: 0.00396,
      },
      latency_ms: 2_380,
      finish_reason: "end_turn",
      created_at: at(60.1),
      score: { value: -1, comment: "Missing the mitigations" },
    },
  ]
}
