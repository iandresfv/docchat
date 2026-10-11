const CITATION = /\[p\.\s?(\d+)\]/g

/** Turns `[p.7]` markers into links the markdown renderer swaps for chips. */
export function linkCitations(text: string): string {
  return text.replace(
    CITATION,
    (_m, page: string) => `[p.${page}](#cite-${page})`
  )
}
