import type { Message } from "@/api/types"

/** `# <title>` + `**You:**` / `**DocChat:**` turns, page refs kept (04 §4.3). */
export function conversationToMarkdown(
  title: string,
  messages: Message[]
): string {
  const lines = [`# ${title}`, ""]
  for (const m of messages) {
    if (m.role === "system") continue
    const who = m.role === "human" ? "**You:**" : "**DocChat:**"
    lines.push(`${who} ${m.content.trim()}`, "")
    if (m.role === "assistant" && m.sources?.length) {
      const pages = [...new Set(m.sources.map((s) => s.page))].sort(
        (a, b) => a - b
      )
      lines.push(`_Sources: ${pages.map((p) => `p.${p}`).join(", ")}_`, "")
    }
  }
  return lines.join("\n")
}

export function downloadText(
  filename: string,
  text: string,
  type = "text/markdown"
) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "conversation"
  )
}
