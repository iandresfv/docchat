const KB = 1024
const MB = KB * 1024

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`
  return `${bytes} B`
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

/** "2 days ago", "yesterday", "just now". */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size)
      return rtf.format(Math.round(seconds / size), unit)
  }
  return "just now"
}

/** Compact relative time for dense rows: "2 h ago", "3 d ago". */
export function formatRelativeShort(iso: string, now = Date.now()): string {
  const seconds = Math.max(
    0,
    Math.round((now - new Date(iso).getTime()) / 1000)
  )
  if (seconds < 60) return "just now"
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} h ago`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)} d ago`
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  })
}

/** "3.9k", "412", "1.2M". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/** Small LLM costs need more precision: "$0.0006", "$1.24". */
export function formatCost(usd: number): string {
  if (usd === 0) return "$0"
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}

export function pluralize(
  n: number,
  singular: string,
  plural = `${singular}s`
) {
  return `${n} ${n === 1 ? singular : plural}`
}
