import { create } from "zustand"

interface ViewerState {
  pdfId: string | null
  page: number
  /** Increments on each citation click so the viewer can flash/reload. */
  citeToken: number
  /** Page of the most recently clicked citation chip (for the 1 s ring). */
  citedPage: number | null
  /** Asks the layout to reveal the viewer (sheet / tab) after a citation. */
  revealToken: number
  open: (pdfId: string) => void
  setPage: (page: number) => void
  cite: (page: number) => void
}

export const useViewer = create<ViewerState>()((set, get) => ({
  pdfId: null,
  page: 1,
  citeToken: 0,
  citedPage: null,
  revealToken: 0,
  open: (pdfId) => {
    if (get().pdfId !== pdfId) set({ pdfId, page: 1, citedPage: null })
  },
  setPage: (page) => set({ page: Math.max(1, page) }),
  cite: (page) =>
    set((s) => ({
      page,
      citedPage: page,
      citeToken: s.citeToken + 1,
      revealToken: s.revealToken + 1,
    })),
}))
