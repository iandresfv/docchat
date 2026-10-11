import type { ComponentCatalog } from "@/api/types"

/** Initial arm registry (01-ARCHITECTURE §6). */
export const catalog: ComponentCatalog = {
  llm: [
    {
      id: "haiku-5-5",
      description: "Claude Haiku 5.5, temperature 0.2 (default)",
      enabled: true,
    },
    {
      id: "haiku-4-5",
      description: "Claude Haiku 4.5 — the course model; 10× pricier",
      enabled: true,
    },
    {
      id: "sonnet-5-5",
      description: "Claude Sonnet 5.5; disabled unless listed in LLM_ARMS",
      enabled: false,
    },
  ],
  retriever: [
    { id: "sim_k4", description: "Similarity search, k = 4", enabled: true },
    {
      id: "mmr_k4",
      description: "MMR, k = 4, fetch_k = 16, λ = 0.5",
      enabled: true,
    },
    {
      id: "mmr_k8",
      description: "MMR, k = 8, fetch_k = 24, λ = 0.7",
      enabled: true,
    },
  ],
  memory: [
    {
      id: "buffer",
      description: "All messages, trimmed to the history token budget",
      enabled: true,
    },
    { id: "window_6", description: "Last 6 messages (3 turns)", enabled: true },
    {
      id: "summary",
      description: "Rolling summary refreshed every 4 turns + last 2 messages",
      enabled: true,
    },
  ],
}

export function enabledArms(axis: keyof ComponentCatalog): string[] {
  return catalog[axis].filter((a) => a.enabled).map((a) => a.id)
}
