import type { Message } from "@/api/types"
import { formatCost, formatDuration, formatTokens } from "@/lib/format"

/** "1.8 s · 3.9k in / 412 out · $0.0006" */
export function messageMetaLine(message: Message): string | null {
  const parts: string[] = []
  if (message.latency_ms) parts.push(formatDuration(message.latency_ms))
  if (message.usage) {
    parts.push(
      `${formatTokens(message.usage.input_tokens)} in / ${formatTokens(message.usage.output_tokens)} out`,
      formatCost(message.usage.cost_usd)
    )
  }
  return parts.length ? parts.join(" · ") : null
}

/** `claude-haiku-5-5` → `haiku-5-5` (the arm id shown in badges). */
export function modelLabel(model: string | undefined): string | null {
  return model ? model.replace(/^claude-/, "") : null
}
