import type { Source, Usage } from "@/api/types"

/**
 * Canned answers grounded in the bundled sample PDF ("Annual report 2025"),
 * so citations in the mock open real pages.
 */
interface Topic {
  keywords: string[]
  answer: string
  sources: [page: number, score: number, snippet: string][]
}

const topics: Topic[] = [
  {
    keywords: ["summar", "overview", "about"],
    answer:
      "This is Northwind Analytics' **annual report for fiscal 2025** [p.1]. In short:\n\n- Revenue grew **18%** to $42.6 million, with gross margin up to 74% [p.4].\n- Operating expenses rose 9% to $27.4 million, led by R&D [p.6].\n- Research focused on retrieval quality; MMR retrieval and windowed memory performed best [p.7].\n- For 2026 the company guides to 15–20% revenue growth [p.12].",
    sources: [
      [
        4,
        0.83,
        "Revenue grew 18% year over year to $42.6 million. Gross margin improved from 71% to 74%.",
      ],
      [
        1,
        0.78,
        "This report summarises the company's performance, strategy and outlook.",
      ],
      [
        12,
        0.74,
        "For 2026 we expect revenue growth of 15% to 20% and stable gross margins.",
      ],
      [
        7,
        0.69,
        "Key findings: maximal marginal relevance (MMR) retrieval improved answer faithfulness on long documents.",
      ],
    ],
  },
  {
    keywords: ["finding", "key", "highlight"],
    answer:
      "The key findings and highlights are [p.4]:\n\n1. Revenue up **18%** to $42.6 million.\n2. Gross margin improved from 71% to **74%**.\n3. Net revenue retention of **121%**.\n4. Free-cash-flow positive for the full year.\n\nOn the research side, MMR retrieval improved faithfulness on long documents and windowed memory matched full-buffer memory at lower cost [p.7].",
    sources: [
      [
        4,
        0.88,
        "Revenue grew 18% year over year to $42.6 million. Gross margin improved from 71% to 74%. Net revenue retention reached 121%.",
      ],
      [
        7,
        0.76,
        "MMR retrieval improved answer faithfulness on long documents, and windowed conversation memory matched full-buffer memory at a fraction of the cost.",
      ],
    ],
  },
  {
    keywords: ["section", "contents", "structure", "chapter"],
    answer:
      "The report has ten sections [p.2]: letter to shareholders, highlights, revenue and growth, operating expenses, product and research, customers and markets, people and culture, risks, sustainability, and the 2026 outlook.",
    sources: [[2, 0.92, "1. Letter to shareholders … 10. Outlook for 2026"]],
  },
  {
    keywords: ["revenue", "grow", "sales"],
    answer:
      "Revenue grew **18%**, from $36.1 million in 2024 to **$42.6 million** in 2025 [p.5]. Subscription revenue was 86% of the total, and growth came from enterprise expansion plus the self-serve plan launched in Q2 [p.5].",
    sources: [
      [
        5,
        0.89,
        "Total revenue was $42.6 million, up 18% from $36.1 million in 2024.",
      ],
      [4, 0.8, "Revenue grew 18% year over year to $42.6 million."],
    ],
  },
  {
    keywords: ["expense", "cost", "spend", "opex"],
    answer:
      "Operating expenses rose **9%** to $27.4 million [p.6]. R&D was the largest line at $11.9 million, while infrastructure cost per customer **fell 14%** after moving inference to smaller models with prompt caching [p.6].",
    sources: [
      [
        6,
        0.9,
        "Operating expenses rose 9% to $27.4 million. Research and development was the largest line at $11.9 million.",
      ],
    ],
  },
  {
    keywords: ["risk", "threat", "concern"],
    answer:
      "Principal risks are dependence on third-party model providers, pricing pressure from larger platforms, data-protection regulation, and revenue concentration — the top 20 customers are **31%** of revenue [p.10].",
    sources: [
      [
        10,
        0.91,
        "Principal risks include dependence on third-party model providers, pricing pressure from larger platforms…",
      ],
    ],
  },
  {
    keywords: ["customer", "market", "region", "vertical"],
    answer:
      "The company ended the year with **1,240 paying customers**, up from 990 [p.8]. Revenue split: North America 58%, Europe 29%, rest of world 13%; top verticals were legal, financial services and research [p.8].",
    sources: [
      [
        8,
        0.87,
        "The company served 1,240 paying customers at year end, up from 990.",
      ],
    ],
  },
  {
    keywords: ["employee", "people", "headcount", "staff", "culture"],
    answer:
      "Headcount grew from 160 to **182 employees** across 14 countries [p.9], [p.4]. Engagement scored 82/100 and a $2,000 yearly learning budget was introduced [p.9].",
    sources: [
      [9, 0.88, "We ended the year with 182 employees across 14 countries."],
      [4, 0.7, "Headcount grew from 160 to 182 people."],
    ],
  },
  {
    keywords: ["2026", "outlook", "next year", "expect", "guidance", "future"],
    answer:
      "For 2026 the company expects **15–20% revenue growth** with stable gross margins [p.12]. Priorities are multi-document reasoning, enterprise controls and a larger partner ecosystem [p.12].",
    sources: [
      [
        12,
        0.9,
        "For 2026 we expect revenue growth of 15% to 20% and stable gross margins.",
      ],
    ],
  },
  {
    keywords: ["research", "product", "mmr", "retriev", "memory", "evaluat"],
    answer:
      "Research focused on retrieval quality and evaluation [p.7]. **MMR retrieval** improved answer faithfulness on long documents, **windowed memory** matched full-buffer memory at a fraction of the cost, and offline retrieval metrics (hit@k, MRR, nDCG) now gate every release [p.7].",
    sources: [
      [
        7,
        0.92,
        "The research team focused on retrieval quality and evaluation.",
      ],
    ],
  },
  {
    keywords: ["sustainab", "emission", "carbon", "energy", "climate"],
    answer:
      "Scope 2 emissions **fell 22%** as workloads moved to cleaner-energy regions, and all offices run on renewable electricity contracts [p.11].",
    sources: [
      [
        11,
        0.89,
        "Scope 2 emissions fell 22% as workloads moved to regions with cleaner energy.",
      ],
    ],
  },
]

const fallback: Topic = {
  keywords: [],
  answer:
    "I couldn't find that in the document. The closest passages are about the company's results and outlook [p.3] — try asking about revenue, expenses, risks or the 2026 outlook.",
  sources: [
    [
      3,
      0.41,
      "2025 was the year our retrieval platform became the core of the business.",
    ],
    [12, 0.37, "For 2026 we expect revenue growth of 15% to 20%."],
  ],
}

const prices: Record<string, [input: number, output: number]> = {
  "haiku-5-5": [0.1, 0.5],
  "haiku-4-5": [1, 5],
  "sonnet-5-5": [2, 10],
}

export function mockAnswer(question: string, llm: string, turn: number) {
  const q = question.toLowerCase()
  const topic =
    topics.find((t) => t.keywords.some((k) => q.includes(k))) ?? fallback
  const sources: Source[] = topic.sources.map(([page, score, snippet], i) => ({
    chunk_id: `mock:${String(page).padStart(4, "0")}:${String(i).padStart(4, "0")}`,
    page,
    score,
    snippet,
  }))
  const input = 3_400 + Math.round(Math.random() * 900) + turn * 180
  const output = Math.round(topic.answer.length / 4)
  const cacheRead = turn > 2 ? 2_048 : 0
  const [inPrice, outPrice] = prices[llm] ?? [0.1, 0.5]
  const cost =
    ((input - cacheRead) * inPrice +
      cacheRead * inPrice * 0.1 +
      output * outPrice) /
    1e6
  const usage: Usage = {
    model: `claude-${llm}`,
    input_tokens: input,
    output_tokens: output,
    cache_read_tokens: cacheRead,
    cache_write_tokens: 0,
    cost_usd: Number(cost.toFixed(6)),
  }
  return {
    text: topic.answer,
    sources,
    usage,
    latencyMs: 900 + Math.round(Math.random() * 1400),
  }
}
